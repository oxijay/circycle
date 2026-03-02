import { NextRequest, NextResponse } from 'next/server'

import { TripService } from '@/lib/trip-service'
import { writeAuditLog } from '@/lib/security/audit-log'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

function normalizeOlderThanDays(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 30
  return Math.max(0, parsed)
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json().catch(() => ({}))
    const olderThanDays = normalizeOlderThanDays(
      (body as { older_than_days?: number }).older_than_days
    )

    const result = await TripService.cleanupStaleActiveTrips({
      olderThanDays,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.cleanup_stale',
      resource_type: 'trip',
      success: true,
      status_code: 200,
      metadata: {
        older_than_days: olderThanDays,
        scanned: result.scanned,
        protected_by_plan: result.protectedByPlan,
        deleted: result.deleted,
      },
    })

    return NextResponse.json({
      older_than_days: olderThanDays,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cleanup stale trips'
    console.error('Failed to cleanup stale trips:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.cleanup_stale',
      resource_type: 'trip',
      success: false,
      status_code: 500,
      message,
    })

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
