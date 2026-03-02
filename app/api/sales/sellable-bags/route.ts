import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.SALES_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const take = Number(request.nextUrl.searchParams.get('take') || 300)

    const rows = await TripService.getSellableBags({
      q,
      take,
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Failed to fetch sellable bags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sellable bags' },
      { status: 500 }
    )
  }
}
