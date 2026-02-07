import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trip = await TripService.getTripWithBags(params.id)
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    return NextResponse.json(trip)
  } catch (error) {
    console.error('Failed to fetch trip:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const trip = await TripService.updateTrip(params.id, body)
    return NextResponse.json(trip)
  } catch (error) {
    console.error('Failed to update trip:', error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}