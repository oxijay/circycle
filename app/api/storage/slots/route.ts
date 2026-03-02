import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function normalizeSlotCode(value: unknown): string {
  const code = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  if (!code) {
    throw new Error('Validation: กรุณากรอกรหัสช่องวาง')
  }

  if (!/^[A-Z0-9-]{1,8}$/.test(code)) {
    throw new Error('Validation: รหัสช่องต้องเป็น A-Z, 0-9 หรือ - และยาวไม่เกิน 8 ตัว')
  }

  return code
}

function isSlotCodeConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes('zone_id') &&
    error.meta.target.includes('slot_code')
  )
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.INVENTORY_LOCATIONS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()

    const zoneId = String(body.zone_id ?? '').trim()
    if (!zoneId) {
      return NextResponse.json({ error: 'Validation: กรุณาเลือกโซนก่อน' }, { status: 400 })
    }

    const zone = await prisma.storageZone.findUnique({
      where: { id: zoneId },
      select: { id: true },
    })

    if (!zone) {
      return NextResponse.json({ error: 'Validation: ไม่พบโซนที่เลือก' }, { status: 400 })
    }

    const slotCode = normalizeSlotCode(body.slot_code)
    const slotName = String(body.slot_name ?? '')
      .trim()
      .slice(0, 100)

    const slot = await prisma.storageSlot.create({
      data: {
        zone_id: zoneId,
        slot_code: slotCode,
        slot_name: slotName || null,
      },
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.slots.create',
      resource_type: 'storage_slot',
      resource_id: slot.id,
      success: true,
      status_code: 200,
      metadata: {
        zone_id: slot.zone_id,
        slot_code: slot.slot_code,
      },
    })

    return NextResponse.json(slot)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation:')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (isSlotCodeConflict(error)) {
      return NextResponse.json({ error: 'รหัสช่องนี้ซ้ำในโซนเดียวกัน' }, { status: 400 })
    }

    console.error('Failed to create storage slot:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.slots.create',
      resource_type: 'storage_slot',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to create storage slot',
    })

    return NextResponse.json({ error: 'Failed to create storage slot' }, { status: 500 })
  }
}
