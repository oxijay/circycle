import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bag = await TripService.createBag(body)
    return NextResponse.json(bag)
  } catch (error) {
    console.error('Failed to create bag:', error)
    return NextResponse.json({ error: 'Failed to create bag' }, { status: 500 })
  }
}