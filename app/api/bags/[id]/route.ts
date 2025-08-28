import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const bag = await TripService.updateBag(params.id, body)
    return NextResponse.json(bag)
  } catch (error) {
    console.error('Failed to update bag:', error)
    return NextResponse.json({ error: 'Failed to update bag' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await TripService.deleteBag(params.id)
    return NextResponse.json({ message: 'Bag deleted successfully' })
  } catch (error) {
    console.error('Failed to delete bag:', error)
    return NextResponse.json({ error: 'Failed to delete bag' }, { status: 500 })
  }
}