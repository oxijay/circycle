import { NextRequest, NextResponse } from 'next/server'

import { resolveActorFromRequest } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { hasPermission, PERMISSIONS } from '@/lib/security/permissions'
import { TripPlanService } from '@/lib/trip-plan-service'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const actor = await resolveActorFromRequest(request)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canOpen = hasPermission(actor.role, PERMISSIONS.TRIP_PLANS_OPEN)
    || hasPermission(actor.role, PERMISSIONS.TRIP_PLANS_MANAGE)
  if (!canOpen) {
    return NextResponse.json(
      {
        error: `Forbidden: permission "${PERMISSIONS.TRIP_PLANS_OPEN}" required`,
        actor: { id: actor.id, role: actor.role },
      },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const { tripPlan, trip } = await TripPlanService.openTripPlan(id, actor.id)

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.open',
      resource_type: 'trip_plan',
      resource_id: tripPlan.id,
      success: true,
      status_code: 200,
      metadata: {
        opened_trip_id: trip.id,
      },
    })

    return NextResponse.json({
      trip_plan: tripPlan,
      trip,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open trip plan'
    const isValidation = message.startsWith('Validation:')
    const isNotFound = message.startsWith('NotFound:')
    const status = isValidation ? 400 : isNotFound ? 404 : 500
    const responseMessage = message.startsWith('Infrastructure:')
      ? `${message} (แนะนำ: ปิด/เปิด backend ใหม่)`
      : message

    await writeAuditLog({
      actor,
      request,
      action: 'trip_plans.open',
      resource_type: 'trip_plan',
      success: false,
      status_code: status,
      message: responseMessage,
    })

    return NextResponse.json({ error: responseMessage }, { status })
  }
}
