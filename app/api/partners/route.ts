import { NextRequest, NextResponse } from 'next/server'
import { PartnerType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function parsePartnerType(value: unknown): PartnerType {
  if (value === 'BUYER') return 'BUYER'
  if (value === 'BOTH') return 'BOTH'
  return 'SUPPLIER'
}

function typeFilter(type: string | null) {
  if (type === 'SUPPLIER') return { in: ['SUPPLIER', 'BOTH'] as PartnerType[] }
  if (type === 'BUYER') return { in: ['BUYER', 'BOTH'] as PartnerType[] }
  if (type === 'BOTH') return { equals: 'BOTH' as PartnerType }
  return undefined
}

async function generatePartnerCode(): Promise<string> {
  const rows = await prisma.partner.findMany({
    where: { partner_code: { not: null } },
    select: { partner_code: true },
  })

  const used = new Set<number>()
  for (const row of rows) {
    const code = (row.partner_code ?? '').trim()
    if (!/^\d{1,4}$/.test(code)) continue
    const parsed = Number.parseInt(code, 10)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 9999) continue
    used.add(parsed)
  }

  for (let i = 1; i <= 9999; i += 1) {
    if (!used.has(i)) return String(i)
  }

  throw new Error('Partner code range exhausted')
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const type = request.nextUrl.searchParams.get('type')
    const active = request.nextUrl.searchParams.get('active')

    const partners = await prisma.partner.findMany({
      where: {
        ...(typeFilter(type) ? { partner_type: typeFilter(type) } : {}),
        ...(active === null ? {} : { is_active: active === 'true' }),
      },
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json(partners)
  } catch (error) {
    console.error('Failed to fetch partners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.PARTNERS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()

    const name = String(body.name ?? '').trim()
    if (!name) {
      return NextResponse.json({ error: 'Partner name is required' }, { status: 400 })
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const partnerCode = await generatePartnerCode()

        const partner = await prisma.partner.create({
          data: {
            partner_code: partnerCode,
            name,
            factory_name: name,
            partner_type: parsePartnerType(body.partner_type),
            contact_name: String(body.contact_name ?? '').trim() || null,
            phone: String(body.phone ?? '').trim() || null,
            address: String(body.address ?? '').trim() || null,
            notes: String(body.notes ?? '').trim() || null,
            is_active: true,
          },
        })

        await writeAuditLog({
          actor: auth.actor,
          request,
          action: 'partners.create',
          resource_type: 'partner',
          resource_id: partner.id,
          success: true,
          status_code: 200,
          metadata: {
            partner_code: partner.partner_code,
            name: partner.name,
            partner_type: partner.partner_type,
          },
        })

        return NextResponse.json(partner)
      } catch (error) {
        const isCodeConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes('partner_code')

        if (!isCodeConflict || attempt === 2) {
          throw error
        }
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate partner code' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Failed to create partner:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'partners.create',
      resource_type: 'partner',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to create partner',
    })

    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    )
  }
}
