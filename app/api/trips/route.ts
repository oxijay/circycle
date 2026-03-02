import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { TripType } from '@prisma/client'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function normalizeTripType(value: unknown): TripType {
  if (value === 'OUTBOUND_SALE') return 'OUTBOUND_SALE'
  return 'INBOUND_PURCHASE'
}

function normalizeScope(value: unknown): 'all' | 'active' | 'history' {
  const scope = String(value ?? '').trim().toLowerCase()
  if (scope === 'active') return 'active'
  if (scope === 'history') return 'history'
  return 'all'
}

function normalizePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const scope = normalizeScope(request.nextUrl.searchParams.get('scope'))
    if (scope === 'active' || scope === 'history') {
      const page = normalizePositiveInt(request.nextUrl.searchParams.get('page'), 1)
      const pageSize = normalizePositiveInt(request.nextUrl.searchParams.get('pageSize'), 20)
      const payload = await TripService.listTrips({ scope, page, pageSize })
      return NextResponse.json(payload)
    }

    const trips = await TripService.getAllTripsWithBags()
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Failed to fetch trips:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const trip = await TripService.createTrip({
      vehicleId: body.vehicleId ?? body.vehicle_id ?? '',
      customerFactory: body.customerFactory ?? body.customer_factory ?? '',
      tripType: normalizeTripType(body.tripType ?? body.trip_type),
      partnerId: body.partnerId ?? body.partner_id ?? null,
      driverName: body.driverName ?? body.driver_name,
      automilVehicleId: body.automilVehicleId ?? body.automil_vehicle_id,
      automilDriverId: body.automilDriverId ?? body.automil_driver_id,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.create',
      resource_type: 'trip',
      resource_id: trip.id,
      success: true,
      status_code: 200,
      metadata: {
        vehicle_id: trip.vehicle_id,
        trip_type: trip.trip_type,
      },
    })

    return NextResponse.json(trip)
  } catch (error) {
    console.error('Failed to create trip:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to create trip'
    const status =
      message.startsWith('Validation:') || message.includes('Partner') ? 400 : 500

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'trips.create',
      resource_type: 'trip',
      success: false,
      status_code: status,
      message,
    })

    return NextResponse.json({ error: message }, { status })
  }
}
