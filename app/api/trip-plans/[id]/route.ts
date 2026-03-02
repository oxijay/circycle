import { NextRequest, NextResponse } from 'next/server'
import { TripPlanStatus, TripType } from '@prisma/client'

import { resolveActorFromRequest } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { hasPermission, PERMISSIONS } from '@/lib/security/permissions'
import { TripPlanService } from '@/lib/trip-plan-service'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseTripType(value: unknown): TripType | undefined {
  if (value === 'INBOUND_PURCHASE') return 'INBOUND_PURCHASE'
  if (value === 'OUTBOUND_SALE') return 'OUTBOUND_SALE'
  return undefined
}

function parseTripPlanStatus(value: unknown): TripPlanStatus | undefined {
  if (value === 'DRAFT') return 'DRAFT'
  if (value === 'SCHEDULED') return 'SCHEDULED'
  if (value === 'CANCELLED') return 'CANCELLED'
  return undefined
}

function parsePlannedStartAt(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Validation: planned_start_at is invalid')
  }
  return parsed
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const actor = await resolveActorFromRequest(request)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasPermission(actor.role, PERMISSIONS.TRIP_PLANS_MANAGE)) {
    return NextResponse.json(
      {
        error: `Forbidden: permission "${PERMISSIONS.TRIP_PLANS_MANAGE}" required`,
        actor: { id: actor.id, role: actor.role },
      },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const tripType = parseTripType(body.trip_type ?? body.tripType)
    const plannedStartAt = parsePlannedStartAt(body.planned_start_at ?? body.plannedStartAt)
    const status = parseTripPlanStatus(body.status)

    const updated = await TripPlanService.updateTripPlan(id, {
      ...(tripType ? { tripType } : {}),
      ...(plannedStartAt ? { plannedStartAt } : {}),
      ...(body.vehicle_id !== undefined || body.vehicleId !== undefined
        ? { vehicleId: String(body.vehicle_id ?? body.vehicleId ?? '') }
        : {}),
      ...(body.customer_factory !== undefined || body.customerFactory !== undefined
        ? { customerFactory: String(body.customer_factory ?? body.customerFactory ?? '') }
        : {}),
      ...(body.partner_id !== undefined || body.partnerId !== undefined
        ? { partnerId: String(body.partner_id ?? body.partnerId ?? '').trim() || null }
        : {}),
      ...(body.driver_name !== undefined || body.driverName !== undefined
        ? { driverName: String(body.driver_name ?? body.driverName ?? '').trim() || null }
        : {}),
      ...(body.automil_vehicle_id !== undefined || body.automilVehicleId !== undefined
        ? {
            automilVehicleId:
              String(body.automil_vehicle_id ?? body.automilVehicleId ?? '').trim() || null,
          }
        : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes ?? '').trim() || null } : {}),
      ...(status ? { status } : {}),
    })

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.update',
      resource_type: 'trip_plan',
      resource_id: updated.id,
      success: true,
      status_code: 200,
      metadata: {
        status: updated.status,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update trip plan'
    const isValidation = message.startsWith('Validation:')
    const isNotFound = message.startsWith('NotFound:')
    const status = isValidation ? 400 : isNotFound ? 404 : 500
    const responseMessage = message.startsWith('Infrastructure:')
      ? `${message} (แนะนำ: ปิด/เปิด backend ใหม่)`
      : message

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.update',
      resource_type: 'trip_plan',
      success: false,
      status_code: status,
      message: responseMessage,
    })

    return NextResponse.json({ error: responseMessage }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const actor = await resolveActorFromRequest(request)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasPermission(actor.role, PERMISSIONS.TRIP_PLANS_MANAGE)) {
    return NextResponse.json(
      {
        error: `Forbidden: permission "${PERMISSIONS.TRIP_PLANS_MANAGE}" required`,
        actor: { id: actor.id, role: actor.role },
      },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const deleted = await TripPlanService.deleteTripPlan(id)

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.delete',
      resource_type: 'trip_plan',
      resource_id: deleted.id,
      success: true,
      status_code: 200,
      metadata: {
        trip_type: deleted.trip_type,
        planned_start_at: deleted.planned_start_at,
      },
    })

    return NextResponse.json({ success: true, id: deleted.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete trip plan'
    const isValidation = message.startsWith('Validation:')
    const isNotFound = message.startsWith('NotFound:')
    const status = isValidation ? 400 : isNotFound ? 404 : 500
    const responseMessage = message.startsWith('Infrastructure:')
      ? `${message} (แนะนำ: ปิด/เปิด backend ใหม่)`
      : message

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.delete',
      resource_type: 'trip_plan',
      success: false,
      status_code: status,
      message: responseMessage,
    })

    return NextResponse.json({ error: responseMessage }, { status })
  }
}
