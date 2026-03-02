import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function normalizeZoneCode(value: unknown): string {
  const code = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  if (!code) return ''
  if (!/^[A-Z0-9-]{1,8}$/.test(code)) {
    throw new Error('Validation: รหัสโซนต้องเป็น A-Z, 0-9 หรือ - และยาวไม่เกิน 8 ตัว')
  }

  return code
}

async function generateZoneCode(): Promise<string> {
  const rows = await prisma.storageZone.findMany({
    where: { zone_code: { startsWith: 'Z' } },
    select: { zone_code: true },
  })

  const used = new Set<number>()
  for (const row of rows) {
    const match = row.zone_code.match(/^Z(\d{1,3})$/)
    if (!match) continue
    const parsed = Number.parseInt(match[1], 10)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 999) continue
    used.add(parsed)
  }

  for (let i = 1; i <= 999; i += 1) {
    if (!used.has(i)) {
      return `Z${String(i).padStart(3, '0')}`
    }
  }

  throw new Error('Zone code range exhausted')
}

function isCodeConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('zone_code')
  )
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const zones = await prisma.storageZone.findMany({
      include: {
        _count: {
          select: { slots: true },
        },
        slots: {
          include: {
            _count: {
              select: { bags: true },
            },
          },
          orderBy: [{ slot_code: 'asc' }],
        },
      },
      orderBy: [{ zone_code: 'asc' }],
    })

    return NextResponse.json(zones)
  } catch (error) {
    console.error('Failed to fetch storage zones:', error)
    return NextResponse.json({ error: 'Failed to fetch storage zones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.INVENTORY_LOCATIONS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()

    const providedCode = normalizeZoneCode(body.zone_code)
    const zoneCode = providedCode || (await generateZoneCode())
    const zoneName = String(body.zone_name ?? '')
      .trim()
      .slice(0, 100)

    const zone = await prisma.storageZone.create({
      data: {
        zone_code: zoneCode,
        zone_name: zoneName || zoneCode,
      },
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.zones.create',
      resource_type: 'storage_zone',
      resource_id: zone.id,
      success: true,
      status_code: 200,
      metadata: {
        zone_code: zone.zone_code,
      },
    })

    return NextResponse.json(zone)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation:')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (isCodeConflict(error)) {
      return NextResponse.json({ error: 'รหัสโซนนี้ถูกใช้งานแล้ว' }, { status: 400 })
    }

    console.error('Failed to create storage zone:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.zones.create',
      resource_type: 'storage_zone',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to create storage zone',
    })

    return NextResponse.json({ error: 'Failed to create storage zone' }, { status: 500 })
  }
}
