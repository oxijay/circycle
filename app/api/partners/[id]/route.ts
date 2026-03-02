import { NextRequest, NextResponse } from 'next/server'
import { PartnerType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parsePartnerType(value: unknown): PartnerType {
  if (value === 'BUYER') return 'BUYER'
  if (value === 'BOTH') return 'BOTH'
  return 'SUPPLIER'
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, PERMISSIONS.PARTNERS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = await request.json()
    const nextName = body.name !== undefined ? String(body.name ?? '').trim() : undefined

    const payload = {
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextName !== undefined ? { factory_name: nextName || null } : {}),
      ...(body.partner_type !== undefined
        ? { partner_type: parsePartnerType(body.partner_type) }
        : {}),
      ...(body.contact_name !== undefined
        ? { contact_name: String(body.contact_name ?? '').trim() || null }
        : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone ?? '').trim() || null } : {}),
      ...(body.address !== undefined
        ? { address: String(body.address ?? '').trim() || null }
        : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes ?? '').trim() || null } : {}),
    }

    if (payload.name !== undefined && !payload.name) {
      return NextResponse.json({ error: 'Partner name is required' }, { status: 400 })
    }

    const partner = await prisma.partner.update({
      where: { id },
      data: payload,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'partners.update',
      resource_type: 'partner',
      resource_id: id,
      success: true,
      status_code: 200,
      metadata: payload,
    })

    return NextResponse.json(partner)
  } catch (error) {
    console.error('Failed to update partner:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'partners.update',
      resource_type: 'partner',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to update partner',
    })

    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, PERMISSIONS.PARTNERS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    await prisma.partner.delete({ where: { id } })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'partners.delete',
      resource_type: 'partner',
      resource_id: id,
      success: true,
      status_code: 200,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete partner:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'partners.delete',
      resource_type: 'partner',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to delete partner',
    })

    return NextResponse.json(
      { error: 'Failed to delete partner' },
      { status: 500 }
    )
  }
}
