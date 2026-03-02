import { NextRequest, NextResponse } from 'next/server'
import { BagMovementType } from '@prisma/client'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

function parseMovementType(value: string | null): BagMovementType | undefined {
  if (value === 'PACK_IN') return 'PACK_IN'
  if (value === 'SPLIT_OUT') return 'SPLIT_OUT'
  if (value === 'SPLIT_IN') return 'SPLIT_IN'
  if (value === 'SALE_OUT') return 'SALE_OUT'
  if (value === 'ADJUST_IN') return 'ADJUST_IN'
  if (value === 'ADJUST_OUT') return 'ADJUST_OUT'
  return undefined
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const bagId = request.nextUrl.searchParams.get('bag_id')?.trim() || ''
    const type = parseMovementType(request.nextUrl.searchParams.get('type'))
    const take = Number(request.nextUrl.searchParams.get('take') || 200)

    const movements = await TripService.getBagMovements({
      q,
      bag_id: bagId || undefined,
      movement_type: type,
      take,
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error('Failed to fetch bag movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bag movements' },
      { status: 500 }
    )
  }
}
