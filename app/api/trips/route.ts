import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'

export async function GET() {
  try {
    const trips = await TripService.getAllTripsWithBags()
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Failed to fetch trips:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const trip = await TripService.createTrip(body)
    return NextResponse.json(trip)
  } catch (error) {
    console.error('Failed to create trip:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
