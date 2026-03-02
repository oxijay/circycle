import { NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

export async function GET(request: Request) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const summary = await TripService.getOperationsSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Failed to fetch operations summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch operations summary' },
      { status: 500 }
    )
  }
}
