import { NextRequest, NextResponse } from 'next/server'
import { TripPlanStatus, TripType } from '@prisma/client'

import { resolveActorFromRequest } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { hasPermission, Permission, PERMISSIONS } from '@/lib/security/permissions'
import { TripPlanService } from '@/lib/trip-plan-service'

function parseTripType(value: unknown): TripType {
  if (value === 'OUTBOUND_SALE') return 'OUTBOUND_SALE'
  return 'INBOUND_PURCHASE'
}

function parseTripPlanStatusForCreate(value: unknown): TripPlanStatus {
  if (value === 'DRAFT') return 'DRAFT'
  return 'SCHEDULED'
}

function parseStatuses(raw: string | null): TripPlanStatus[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is TripPlanStatus =>
      value === 'DRAFT' || value === 'SCHEDULED' || value === 'OPENED' || value === 'CANCELLED'
    )
}

function parsePlannedStartAt(value: unknown): Date {
  const source = String(value ?? '').trim()
  if (!source) throw new Error('Validation: planned_start_at is required')

  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Validation: planned_start_at is invalid')
  }
  return parsed
}

function hasAnyPermission(
  requested: Permission[],
  actorRole: Parameters<typeof hasPermission>[0]
): boolean {
  return requested.some((permission) => hasPermission(actorRole, permission))
}

export async function GET(request: NextRequest) {
  const actor = await resolveActorFromRequest(request)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const readyOnly = request.nextUrl.searchParams.get('ready') === 'true'
    const statuses = parseStatuses(request.nextUrl.searchParams.get('status'))
    const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '', 10)

    const allowed = readyOnly
      ? hasAnyPermission([PERMISSIONS.TRIP_PLANS_OPEN, PERMISSIONS.TRIP_PLANS_MANAGE], actor.role)
      : hasPermission(actor.role, PERMISSIONS.TRIP_PLANS_MANAGE)

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Forbidden: permission "${readyOnly ? PERMISSIONS.TRIP_PLANS_OPEN : PERMISSIONS.TRIP_PLANS_MANAGE}" required`,
          actor: { id: actor.id, role: actor.role },
        },
        { status: 403 }
      )
    }

    const tripPlans = await TripPlanService.listTripPlans({
      readyOnly,
      statuses,
      limit: Number.isFinite(limit) ? limit : undefined,
    })

    return NextResponse.json(tripPlans)
  } catch (error) {
    console.error('Failed to fetch trip plans:', error)
    return NextResponse.json({ error: 'Failed to fetch trip plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const body = (await request.json()) as Record<string, unknown>

    const plan = await TripPlanService.createTripPlan({
      tripType: parseTripType(body.trip_type ?? body.tripType),
      plannedStartAt: parsePlannedStartAt(body.planned_start_at ?? body.plannedStartAt),
      vehicleId: String(body.vehicle_id ?? body.vehicleId ?? ''),
      customerFactory: String(body.customer_factory ?? body.customerFactory ?? ''),
      partnerId: String(body.partner_id ?? body.partnerId ?? '').trim() || null,
      driverName: String(body.driver_name ?? body.driverName ?? '').trim() || null,
      automilVehicleId:
        String(body.automil_vehicle_id ?? body.automilVehicleId ?? '').trim() || null,
      notes: String(body.notes ?? '').trim() || null,
      status: parseTripPlanStatusForCreate(body.status),
      createdByUserId: actor.id,
    })

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.create',
      resource_type: 'trip_plan',
      resource_id: plan.id,
      success: true,
      status_code: 200,
      metadata: {
        status: plan.status,
        trip_type: plan.trip_type,
        planned_start_at: plan.planned_start_at,
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create trip plan'
    const status = message.startsWith('Validation:') ? 400 : 500
    const responseMessage = message.startsWith('Infrastructure:')
      ? `${message} (แนะนำ: ปิด/เปิด backend ใหม่)`
      : message
    console.error('Failed to create trip plan:', error)

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.create',
      resource_type: 'trip_plan',
      success: false,
      status_code: status,
      message: responseMessage,
    })

    return NextResponse.json({ error: responseMessage }, { status })
  }
}
