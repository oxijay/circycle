import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

function toPositiveNumber(value: string | null, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

type AgingBucket = {
  label: string
  minDays: number
  maxDays: number | null
}

const AGING_BUCKETS: AgingBucket[] = [
  { label: '0-7 วัน', minDays: 0, maxDays: 7 },
  { label: '8-30 วัน', minDays: 8, maxDays: 30 },
  { label: '>30 วัน', minDays: 31, maxDays: null },
]

function csvEscape(value: unknown): string {
  const raw = String(value ?? '')
  if (!/[",\n]/.test(raw)) return raw
  return `"${raw.replace(/"/g, '""')}"`
}

function csvRow(values: unknown[]): string {
  return values.map((value) => csvEscape(value)).join(',')
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const days = toPositiveNumber(request.nextUrl.searchParams.get('days'), 30)
    const varianceThresholdPct = toPositiveNumber(
      request.nextUrl.searchParams.get('variancePct'),
      1.5
    )
    const slaHours = toPositiveNumber(request.nextUrl.searchParams.get('slaHours'), 24)
    const now = new Date()
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const [trips, bags] = await Promise.all([
      prisma.trip.findMany({
        where: {
          created_at: { gte: from },
        },
        select: {
          id: true,
          trip_type: true,
          status: true,
          created_at: true,
          departed_plant_at: true,
          arrived_plant_at: true,
          customer_reported_weight: true,
          our_net_weight: true,
          loaded_weight_in: true,
          empty_weight_after_unload: true,
          weight_variance: true,
          partner: {
            select: {
              id: true,
              name: true,
              factory_name: true,
            },
          },
        },
        orderBy: [{ created_at: 'desc' }],
      }),
      prisma.bag.findMany({
        where: {
          current_weight: { gt: 0 },
          status: { notIn: ['SOLD', 'CLOSED'] },
        },
        select: {
          id: true,
          bag_code: true,
          material: true,
          current_weight: true,
          filled_at: true,
          created_at: true,
          storage_slot: {
            select: {
              slot_code: true,
              zone: {
                select: {
                  zone_code: true,
                },
              },
            },
          },
        },
      }),
    ])

    const totalTrips = trips.length
    const closedTrips = trips.filter((trip) => trip.status === 'COMPLETED' || trip.status === 'RECONCILED')
    const activeTrips = totalTrips - closedTrips.length
    const inboundCount = trips.filter((trip) => trip.trip_type === 'INBOUND_PURCHASE').length
    const outboundCount = totalTrips - inboundCount

    const cycleHoursList = closedTrips
      .map((trip) => {
        const startedAt = trip.departed_plant_at ?? trip.created_at
        const endedAt = trip.arrived_plant_at
        if (!endedAt) return null
        const hours = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60)
        if (!Number.isFinite(hours) || hours < 0) return null
        return hours
      })
      .filter((hours): hours is number => hours !== null)

    const avgCycleHours = cycleHoursList.length > 0
      ? Number((cycleHoursList.reduce((sum, hours) => sum + hours, 0) / cycleHoursList.length).toFixed(2))
      : 0
    const slaMetCount = cycleHoursList.filter((hours) => hours <= slaHours).length
    const slaMetPct = cycleHoursList.length > 0
      ? Number(((slaMetCount / cycleHoursList.length) * 100).toFixed(1))
      : 0

    const varianceRows = trips
      .map((trip) => {
        const customerWeight = Number(trip.customer_reported_weight) || 0
        if (customerWeight <= 0) return null

        const ourNet = Number(trip.our_net_weight) || 0
        const loaded = Number(trip.loaded_weight_in) || 0
        const emptyAfter = Number(trip.empty_weight_after_unload) || 0
        const fallbackNet = loaded > 0 && emptyAfter >= 0 && loaded >= emptyAfter
          ? loaded - emptyAfter
          : 0
        const netWeight = ourNet > 0 ? ourNet : fallbackNet
        const variance = Number(trip.weight_variance) || (netWeight - customerWeight)
        const variancePct = customerWeight > 0 ? (variance / customerWeight) * 100 : 0
        const absVariancePct = Math.abs(variancePct)

        return {
          partner_id: trip.partner?.id || null,
          partner_name: trip.partner?.factory_name || trip.partner?.name || 'ไม่ระบุคู่ค้า',
          variance,
          variancePct,
          absVariancePct,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))

    const averageAbsVariancePct = varianceRows.length > 0
      ? Number((varianceRows.reduce((sum, row) => sum + row.absVariancePct, 0) / varianceRows.length).toFixed(2))
      : 0
    const maxAbsVariancePct = varianceRows.length > 0
      ? Number(Math.max(...varianceRows.map((row) => row.absVariancePct)).toFixed(2))
      : 0
    const withinThresholdCount = varianceRows.filter(
      (row) => row.absVariancePct <= varianceThresholdPct
    ).length
    const withinThresholdPct = varianceRows.length > 0
      ? Number(((withinThresholdCount / varianceRows.length) * 100).toFixed(1))
      : 0

    const partnerMap = new Map<string, {
      partner_id: string | null
      partner_name: string
      trip_count: number
      sum_abs_variance_pct: number
      sum_abs_variance_kg: number
    }>()
    for (const row of varianceRows) {
      const key = row.partner_id || row.partner_name
      const prev = partnerMap.get(key) || {
        partner_id: row.partner_id,
        partner_name: row.partner_name,
        trip_count: 0,
        sum_abs_variance_pct: 0,
        sum_abs_variance_kg: 0,
      }
      prev.trip_count += 1
      prev.sum_abs_variance_pct += row.absVariancePct
      prev.sum_abs_variance_kg += Math.abs(row.variance)
      partnerMap.set(key, prev)
    }
    const topPartners = Array.from(partnerMap.values())
      .map((row) => ({
        partner_id: row.partner_id,
        partner_name: row.partner_name,
        trip_count: row.trip_count,
        avg_abs_variance_pct: Number((row.sum_abs_variance_pct / row.trip_count).toFixed(2)),
        total_abs_variance_kg: Math.round(row.sum_abs_variance_kg),
      }))
      .sort((a, b) => b.avg_abs_variance_pct - a.avg_abs_variance_pct)
      .slice(0, 10)

    const bagRows = bags.map((bag) => {
      const refDate = bag.filled_at ?? bag.created_at
      const ageDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
      )
      const currentWeight = Number(bag.current_weight) || 0
      const zoneCode = bag.storage_slot?.zone?.zone_code || null
      const slotCode = bag.storage_slot?.slot_code || null

      return {
        bag_id: bag.id,
        bag_code: bag.bag_code,
        material: bag.material,
        age_days: ageDays,
        current_weight: Math.round(currentWeight),
        zone_code: zoneCode,
        slot_code: slotCode,
        filled_at: bag.filled_at,
      }
    })

    const agingBuckets = AGING_BUCKETS.map((bucket) => {
      const rows = bagRows.filter((bag) => {
        if (bag.age_days < bucket.minDays) return false
        if (bucket.maxDays === null) return true
        return bag.age_days <= bucket.maxDays
      })
      return {
        label: bucket.label,
        count: rows.length,
        total_weight: Math.round(rows.reduce((sum, bag) => sum + bag.current_weight, 0)),
      }
    })

    const oldestBags = [...bagRows]
      .sort((a, b) => b.age_days - a.age_days)
      .slice(0, 10)

    const payload = {
      generated_at: now.toISOString(),
      window: {
        days,
        from: from.toISOString(),
        to: now.toISOString(),
      },
      trip_performance: {
        total_trips: totalTrips,
        closed_trips: closedTrips.length,
        active_trips: activeTrips,
        inbound_count: inboundCount,
        outbound_count: outboundCount,
        avg_cycle_hours: avgCycleHours,
        sla_hours: slaHours,
        sla_met_count: slaMetCount,
        sla_met_pct: slaMetPct,
      },
      weighbridge_accuracy: {
        total_with_customer_weight: varianceRows.length,
        threshold_pct: varianceThresholdPct,
        average_abs_variance_pct: averageAbsVariancePct,
        max_abs_variance_pct: maxAbsVariancePct,
        within_threshold_count: withinThresholdCount,
        within_threshold_pct: withinThresholdPct,
        top_partners: topPartners,
      },
      inventory_aging: {
        total_bags: bagRows.length,
        total_weight: Math.round(bagRows.reduce((sum, bag) => sum + bag.current_weight, 0)),
        buckets: agingBuckets,
        oldest_bags: oldestBags,
      },
    }

    if (request.nextUrl.searchParams.get('format') === 'csv') {
      const lines: string[] = []
      lines.push(csvRow(['Report Generated At', payload.generated_at]))
      lines.push(csvRow(['Window Days', payload.window.days]))
      lines.push(csvRow(['Window From', payload.window.from]))
      lines.push(csvRow(['Window To', payload.window.to]))
      lines.push('')

      lines.push('Trip Performance')
      lines.push(csvRow(['Metric', 'Value']))
      lines.push(csvRow(['Total Trips', payload.trip_performance.total_trips]))
      lines.push(csvRow(['Closed Trips', payload.trip_performance.closed_trips]))
      lines.push(csvRow(['Active Trips', payload.trip_performance.active_trips]))
      lines.push(csvRow(['Inbound Trips', payload.trip_performance.inbound_count]))
      lines.push(csvRow(['Outbound Trips', payload.trip_performance.outbound_count]))
      lines.push(csvRow(['Average Cycle Hours', payload.trip_performance.avg_cycle_hours]))
      lines.push(csvRow(['SLA Hours', payload.trip_performance.sla_hours]))
      lines.push(csvRow(['SLA Met Count', payload.trip_performance.sla_met_count]))
      lines.push(csvRow(['SLA Met %', payload.trip_performance.sla_met_pct]))
      lines.push('')

      lines.push('Weighbridge Accuracy')
      lines.push(csvRow(['Metric', 'Value']))
      lines.push(
        csvRow([
          'Total Trips With Customer Weight',
          payload.weighbridge_accuracy.total_with_customer_weight,
        ])
      )
      lines.push(csvRow(['Threshold %', payload.weighbridge_accuracy.threshold_pct]))
      lines.push(
        csvRow([
          'Average Absolute Variance %',
          payload.weighbridge_accuracy.average_abs_variance_pct,
        ])
      )
      lines.push(
        csvRow(['Maximum Absolute Variance %', payload.weighbridge_accuracy.max_abs_variance_pct])
      )
      lines.push(
        csvRow([
          'Within Threshold Count',
          payload.weighbridge_accuracy.within_threshold_count,
        ])
      )
      lines.push(
        csvRow(['Within Threshold %', payload.weighbridge_accuracy.within_threshold_pct])
      )
      lines.push('')

      lines.push('Top Partners By Variance')
      lines.push(csvRow(['Partner', 'Trips', 'Avg |Variance %|', 'Total |Variance kg|']))
      for (const row of payload.weighbridge_accuracy.top_partners) {
        lines.push(
          csvRow([
            row.partner_name,
            row.trip_count,
            row.avg_abs_variance_pct,
            row.total_abs_variance_kg,
          ])
        )
      }
      lines.push('')

      lines.push('Inventory Aging Buckets')
      lines.push(csvRow(['Bucket', 'Bag Count', 'Total Weight']))
      for (const row of payload.inventory_aging.buckets) {
        lines.push(csvRow([row.label, row.count, row.total_weight]))
      }
      lines.push('')

      lines.push('Oldest Bags')
      lines.push(csvRow(['Bag Code', 'Material', 'Age Days', 'Current Weight', 'Zone', 'Slot']))
      for (const row of payload.inventory_aging.oldest_bags) {
        lines.push(
          csvRow([
            row.bag_code,
            row.material || '',
            row.age_days,
            row.current_weight,
            row.zone_code || '',
            row.slot_code || '',
          ])
        )
      }

      const csvContent = `\uFEFF${lines.join('\n')}`
      const filename = `reports-${new Date().toISOString().slice(0, 10)}.csv`
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to fetch reports summary:', error)
    return NextResponse.json({ error: 'Failed to fetch reports summary' }, { status: 500 })
  }
}
