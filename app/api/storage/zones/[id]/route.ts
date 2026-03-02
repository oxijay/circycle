import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeZoneCode(value: unknown): string {
  const code = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  if (!code) {
    throw new Error('Validation: กรุณากรอกรหัสโซน')
  }

  if (!/^[A-Z0-9-]{1,8}$/.test(code)) {
    throw new Error('Validation: รหัสโซนต้องเป็น A-Z, 0-9 หรือ - และยาวไม่เกิน 8 ตัว')
  }

  return code
}

function isZoneCodeConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('zone_code')
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.INVENTORY_LOCATIONS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = await request.json()

    const zone = await prisma.storageZone.findUnique({
      where: { id },
      select: {
        id: true,
        zone_code: true,
        zone_name: true,
      },
    })

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    const hasZoneCode = Object.prototype.hasOwnProperty.call(body, 'zone_code')
    const hasZoneName = Object.prototype.hasOwnProperty.call(body, 'zone_name')
    if (!hasZoneCode && !hasZoneName) {
      return NextResponse.json(
        { error: 'Validation: ไม่มีข้อมูลที่ต้องการแก้ไข' },
        { status: 400 }
      )
    }

    let nextZoneCode = zone.zone_code
    let nextZoneName = zone.zone_name

    if (hasZoneCode) {
      nextZoneCode = normalizeZoneCode(body.zone_code)
    }

    if (hasZoneName) {
      const zoneName = String(body.zone_name ?? '')
        .trim()
        .slice(0, 100)
      nextZoneName = zoneName || nextZoneCode
    } else if (hasZoneCode && !nextZoneName.trim()) {
      nextZoneName = nextZoneCode
    }

    const updated = await prisma.storageZone.update({
      where: { id },
      data: {
        zone_code: nextZoneCode,
        zone_name: nextZoneName,
      },
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.zones.update',
      resource_type: 'storage_zone',
      resource_id: updated.id,
      success: true,
      status_code: 200,
      metadata: {
        from: {
          zone_code: zone.zone_code,
          zone_name: zone.zone_name,
        },
        to: {
          zone_code: updated.zone_code,
          zone_name: updated.zone_name,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation:')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (isZoneCodeConflict(error)) {
      return NextResponse.json({ error: 'รหัสโซนนี้ถูกใช้งานแล้ว' }, { status: 400 })
    }

    console.error('Failed to update storage zone:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.zones.update',
      resource_type: 'storage_zone',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to update storage zone',
    })

    return NextResponse.json({ error: 'Failed to update storage zone' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.INVENTORY_LOCATIONS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params

    const zone = await prisma.storageZone.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            _count: {
              select: { bags: true },
            },
          },
        },
      },
    })

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    const hasBagsInZone = zone.slots.some((slot) => slot._count.bags > 0)
    if (hasBagsInZone) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบโซนที่ยังมีเป้ค้างอยู่ได้' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.storageSlot.deleteMany({
        where: { zone_id: id },
      })
      await tx.storageZone.delete({
        where: { id },
      })
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.zones.delete',
      resource_type: 'storage_zone',
      resource_id: id,
      success: true,
      status_code: 200,
    })

    return NextResponse.json({ message: 'Zone deleted successfully' })
  } catch (error) {
    console.error('Failed to delete storage zone:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.zones.delete',
      resource_type: 'storage_zone',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to delete storage zone',
    })

    return NextResponse.json({ error: 'Failed to delete storage zone' }, { status: 500 })
  }
}
