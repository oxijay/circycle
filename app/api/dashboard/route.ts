import { NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

export async function GET(request: Request) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const [stats, trips] = await Promise.all([
      TripService.getStatistics(),
      TripService.getAllTripsWithBags(),
    ])

    const latestTrips = trips.slice(0, 5).map((trip) => ({
      id: trip.id,
      trip_type: trip.trip_type,
      vehicle_id: trip.vehicle_id,
      customer_factory: trip.customer_factory,
      status: trip.status,
      weight_difference: trip.weight_difference,
      bags_count: trip.bags.length,
      created_at: trip.created_at,
    }))

    const completionRate =
      stats.totalTrips > 0
        ? Math.round((stats.completedTrips / stats.totalTrips) * 100)
        : 0

    return NextResponse.json({
      ...stats,
      completionRate,
      latestTrips,
    })
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
