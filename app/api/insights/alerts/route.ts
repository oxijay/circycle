import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

type AlertSeverity = 'critical' | 'warning' | 'info'
type AlertState = {
  alert_key: string
  acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by_user_id: string | null
  acknowledged_by_name: string | null
  assigned_user_id: string | null
  assigned_user_name: string | null
  assigned_at: string | null
}

const ALERT_ACTIONS = ['alerts.ack', 'alerts.unack', 'alerts.assign', 'alerts.unassign'] as const
type AlertAction = (typeof ALERT_ACTIONS)[number]

function toPositiveNumber(value: string | null, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function parseActionMetadata(metadata: Prisma.JsonValue | null | undefined): {
  assigned_user_id?: string
  assigned_user_name?: string
} {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const obj = metadata as Record<string, unknown>
  return {
    assigned_user_id:
      typeof obj.assigned_user_id === 'string' ? obj.assigned_user_id : undefined,
    assigned_user_name:
      typeof obj.assigned_user_name === 'string' ? obj.assigned_user_name : undefined,
  }
}

function getPlannedSeverity(overdueMinutes: number): AlertSeverity {
  if (overdueMinutes >= 180) return 'critical'
  if (overdueMinutes >= 60) return 'warning'
  return 'info'
}

function getStaleSeverity(elapsedHours: number): AlertSeverity {
  if (elapsedHours >= 24) return 'critical'
  if (elapsedHours >= 12) return 'warning'
  return 'info'
}

function getVarianceSeverity(absVariancePct: number): AlertSeverity {
  if (absVariancePct >= 5) return 'critical'
  if (absVariancePct >= 2.5) return 'warning'
  return 'info'
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const staleHours = toPositiveNumber(request.nextUrl.searchParams.get('staleHours'), 8)
    const planGraceMinutes = toPositiveNumber(
      request.nextUrl.searchParams.get('planGraceMinutes'),
      30
    )
    const varianceThresholdPct = toPositiveNumber(
      request.nextUrl.searchParams.get('variancePct'),
      1.5
    )
    const lookbackDays = toPositiveNumber(request.nextUrl.searchParams.get('lookbackDays'), 7)
    const now = new Date()
    const startedThreshold = new Date(now.getTime() - staleHours * 60 * 60 * 1000)
    const planOverdueThreshold = new Date(now.getTime() - planGraceMinutes * 60 * 1000)
    const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000)

    const [plannedOverdueRaw, staleTripsRaw, varianceTripsRaw] = await Promise.all([
      prisma.tripPlan.findMany({
        where: {
          status: 'SCHEDULED',
          opened_trip_id: null,
          planned_start_at: { lte: planOverdueThreshold },
        },
        orderBy: [{ planned_start_at: 'asc' }],
        take: 50,
      }),
      prisma.trip.findMany({
        where: {
          status: {
            notIn: ['COMPLETED', 'RECONCILED'],
          },
          departed_plant_at: {
            not: null,
            lte: startedThreshold,
          },
          arrived_plant_at: null,
        },
        select: {
          id: true,
          status: true,
          vehicle_id: true,
          driver_name: true,
          customer_factory: true,
          departed_plant_at: true,
          updated_at: true,
        },
        orderBy: [{ departed_plant_at: 'asc' }],
        take: 50,
      }),
      prisma.trip.findMany({
        where: {
          updated_at: { gte: lookbackStart },
          customer_reported_weight: { gt: 0 },
        },
        select: {
          id: true,
          status: true,
          customer_reported_weight: true,
          our_net_weight: true,
          loaded_weight_in: true,
          empty_weight_after_unload: true,
          weight_variance: true,
          updated_at: true,
          partner: {
            select: {
              id: true,
              name: true,
              factory_name: true,
            },
          },
          customer_factory: true,
        },
        orderBy: [{ updated_at: 'desc' }],
        take: 300,
      }),
    ])

    const plannedOverdue = plannedOverdueRaw.map((plan) => {
      const overdueMinutes = Math.max(
        0,
        Math.floor((now.getTime() - new Date(plan.planned_start_at).getTime()) / (60 * 1000))
      )

      return {
        alert_key: `plan:${plan.id}`,
        severity: getPlannedSeverity(overdueMinutes),
        plan_id: plan.id,
        trip_type: plan.trip_type,
        planned_start_at: plan.planned_start_at,
        overdue_minutes: overdueMinutes,
        vehicle_id: plan.vehicle_id,
        driver_name: plan.driver_name,
        customer_factory: plan.customer_factory,
      }
    })

    const staleTrips = staleTripsRaw.map((trip) => {
      const startedAt = trip.departed_plant_at ? new Date(trip.departed_plant_at) : null
      const elapsedHours = startedAt
        ? Number(((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60)).toFixed(1))
        : 0

      return {
        alert_key: `trip:stale:${trip.id}`,
        severity: getStaleSeverity(elapsedHours),
        trip_id: trip.id,
        status: trip.status,
        vehicle_id: trip.vehicle_id,
        driver_name: trip.driver_name,
        customer_factory: trip.customer_factory,
        started_at: trip.departed_plant_at,
        elapsed_hours: elapsedHours,
        updated_at: trip.updated_at,
      }
    })

    const varianceAlerts = varianceTripsRaw
      .map((trip) => {
        const customerWeight = Number(trip.customer_reported_weight) || 0
        const ourNet = Number(trip.our_net_weight) || 0
        const loaded = Number(trip.loaded_weight_in) || 0
        const emptyAfter = Number(trip.empty_weight_after_unload) || 0
        const fallbackNet =
          loaded > 0 && emptyAfter >= 0 && loaded >= emptyAfter ? loaded - emptyAfter : 0
        const netWeight = ourNet > 0 ? ourNet : fallbackNet
        const variance = Number(trip.weight_variance) || (netWeight - customerWeight)
        const variancePct = customerWeight > 0 ? (variance / customerWeight) * 100 : 0
        const absVariancePct = Math.abs(variancePct)

        return {
          alert_key: `trip:variance:${trip.id}`,
          severity: getVarianceSeverity(absVariancePct),
          trip_id: trip.id,
          status: trip.status,
          customer_factory: trip.customer_factory,
          partner_name: trip.partner?.factory_name || trip.partner?.name || null,
          customer_weight: Math.round(customerWeight),
          our_net_weight: Math.round(netWeight),
          variance: Math.round(variance),
          variance_pct: Number(variancePct.toFixed(2)),
          abs_variance_pct: Number(absVariancePct.toFixed(2)),
          updated_at: trip.updated_at,
        }
      })
      .filter((trip) => trip.abs_variance_pct >= varianceThresholdPct)
      .sort((a, b) => b.abs_variance_pct - a.abs_variance_pct)
      .slice(0, 50)

    const alertKeys = [
      ...plannedOverdue.map((row) => row.alert_key),
      ...staleTrips.map((row) => row.alert_key),
      ...varianceAlerts.map((row) => row.alert_key),
    ]

    const statesMap = new Map<string, AlertState>()
    if (alertKeys.length > 0) {
      const actionLogs = await prisma.auditLog.findMany({
        where: {
          resource_type: 'alert',
          resource_id: { in: alertKeys },
          action: { in: [...ALERT_ACTIONS] },
          success: true,
        },
        orderBy: [{ created_at: 'desc' }],
        take: 1000,
      })

      for (const key of alertKeys) {
        statesMap.set(key, {
          alert_key: key,
          acknowledged: false,
          acknowledged_at: null,
          acknowledged_by_user_id: null,
          acknowledged_by_name: null,
          assigned_user_id: null,
          assigned_user_name: null,
          assigned_at: null,
        })
      }

      for (const row of actionLogs) {
        const key = row.resource_id
        if (!key) continue
        const state = statesMap.get(key)
        if (!state) continue
        const action = row.action as AlertAction
        const metadata = parseActionMetadata(row.metadata)

        if (state.acknowledged_at === null && (action === 'alerts.ack' || action === 'alerts.unack')) {
          if (action === 'alerts.ack') {
            state.acknowledged = true
            state.acknowledged_at = row.created_at.toISOString()
            state.acknowledged_by_user_id = row.actor_user_id || null
            state.acknowledged_by_name = row.actor_name || null
          } else {
            state.acknowledged = false
            state.acknowledged_at = null
            state.acknowledged_by_user_id = null
            state.acknowledged_by_name = null
          }
        }

        if (state.assigned_at === null && (action === 'alerts.assign' || action === 'alerts.unassign')) {
          if (action === 'alerts.assign') {
            state.assigned_user_id = metadata.assigned_user_id || null
            state.assigned_user_name = metadata.assigned_user_name || null
            state.assigned_at = row.created_at.toISOString()
          } else {
            state.assigned_user_id = null
            state.assigned_user_name = null
            state.assigned_at = null
          }
        }
      }
    }

    const enrich = <T extends { alert_key: string; severity: AlertSeverity }>(row: T) => ({
      ...row,
      state:
        statesMap.get(row.alert_key) || {
          alert_key: row.alert_key,
          acknowledged: false,
          acknowledged_at: null,
          acknowledged_by_user_id: null,
          acknowledged_by_name: null,
          assigned_user_id: null,
          assigned_user_name: null,
          assigned_at: null,
        },
    })

    const plannedOverdueWithState = plannedOverdue.map(enrich)
    const staleTripsWithState = staleTrips.map(enrich)
    const varianceAlertsWithState = varianceAlerts.map(enrich)

    const severityCount = { critical: 0, warning: 0, info: 0 }
    for (const row of [
      ...plannedOverdueWithState,
      ...staleTripsWithState,
      ...varianceAlertsWithState,
    ]) {
      severityCount[row.severity] += 1
    }

    return NextResponse.json({
      generated_at: now.toISOString(),
      thresholds: {
        stale_hours: staleHours,
        plan_grace_minutes: planGraceMinutes,
        variance_pct: varianceThresholdPct,
        lookback_days: lookbackDays,
      },
      counts: {
        planned_overdue: plannedOverdueWithState.length,
        stale_trips: staleTripsWithState.length,
        variance_alerts: varianceAlertsWithState.length,
      },
      severity_counts: severityCount,
      planned_overdue: plannedOverdueWithState,
      stale_trips: staleTripsWithState,
      variance_alerts: varianceAlertsWithState,
    })
  } catch (error) {
    console.error('Failed to fetch alerts summary:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts summary' }, { status: 500 })
  }
}
