import { NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.SALES_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const order = await TripService.getSaleOrderById(id)
    if (!order) {
      return NextResponse.json({ error: 'Sale order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('Failed to fetch sale order:', error)
    return NextResponse.json({ error: 'Failed to fetch sale order' }, { status: 500 })
  }
}
