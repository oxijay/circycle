import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

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

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.INVENTORY_LOCATIONS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = await request.json()

    const slot = await prisma.storageSlot.findUnique({
      where: { id },
      select: {
        id: true,
        slot_code: true,
        slot_name: true,
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    const hasSlotCode = Object.prototype.hasOwnProperty.call(body, 'slot_code')
    const hasSlotName = Object.prototype.hasOwnProperty.call(body, 'slot_name')
    if (!hasSlotCode && !hasSlotName) {
      return NextResponse.json(
        { error: 'Validation: ไม่มีข้อมูลที่ต้องการแก้ไข' },
        { status: 400 }
      )
    }

    const nextSlotCode = hasSlotCode ? normalizeSlotCode(body.slot_code) : slot.slot_code
    const nextSlotName = hasSlotName
      ? String(body.slot_name ?? '').trim().slice(0, 100) || null
      : slot.slot_name

    const updated = await prisma.storageSlot.update({
      where: { id },
      data: {
        slot_code: nextSlotCode,
        slot_name: nextSlotName,
      },
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.slots.update',
      resource_type: 'storage_slot',
      resource_id: updated.id,
      success: true,
      status_code: 200,
      metadata: {
        from: {
          slot_code: slot.slot_code,
          slot_name: slot.slot_name,
        },
        to: {
          slot_code: updated.slot_code,
          slot_name: updated.slot_name,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation:')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (isSlotCodeConflict(error)) {
      return NextResponse.json({ error: 'รหัสช่องนี้ซ้ำในโซนเดียวกัน' }, { status: 400 })
    }

    console.error('Failed to update storage slot:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.slots.update',
      resource_type: 'storage_slot',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to update storage slot',
    })

    return NextResponse.json({ error: 'Failed to update storage slot' }, { status: 500 })
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

    const slot = await prisma.storageSlot.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bags: true },
        },
      },
    })

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    if (slot._count.bags > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบช่องที่ยังมีเป้อยู่ได้' },
        { status: 400 }
      )
    }

    await prisma.storageSlot.delete({
      where: { id },
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.slots.delete',
      resource_type: 'storage_slot',
      resource_id: id,
      success: true,
      status_code: 200,
    })

    return NextResponse.json({ message: 'Slot deleted successfully' })
  } catch (error) {
    console.error('Failed to delete storage slot:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.slots.delete',
      resource_type: 'storage_slot',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to delete storage slot',
    })

    return NextResponse.json({ error: 'Failed to delete storage slot' }, { status: 500 })
  }
}
