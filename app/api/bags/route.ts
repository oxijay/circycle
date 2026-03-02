import { NextRequest, NextResponse } from 'next/server'
import { BagStatus, Prisma } from '@prisma/client'
import { TripService } from '@/lib/trip-service'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function parseBagStatus(value: string | null): BagStatus | undefined {
  if (value === 'OPEN') return 'OPEN'
  if (value === 'PARTIAL') return 'PARTIAL'
  if (value === 'SOLD') return 'SOLD'
  if (value === 'SPLIT') return 'SPLIT'
  if (value === 'CLOSED') return 'CLOSED'
  return undefined
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const material = request.nextUrl.searchParams.get('material')?.trim() || ''
    const zoneId = request.nextUrl.searchParams.get('zone_id')?.trim() || ''
    const slotId = request.nextUrl.searchParams.get('slot_id')?.trim() || ''
    const ready = request.nextUrl.searchParams.get('ready')
    const status = parseBagStatus(request.nextUrl.searchParams.get('status'))

    const where: Prisma.BagWhereInput = {
      current_weight: { gt: 0 },
    }

    if (q) {
      where.OR = [
        { bag_code: { contains: q, mode: 'insensitive' } },
        { material: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
      ]
    }

    if (material) {
      where.material = { contains: material, mode: 'insensitive' }
    }

    if (status === 'OPEN' || status === 'PARTIAL') {
      where.status = status
    } else {
      where.status = { in: ['OPEN', 'PARTIAL'] }
    }

    if (ready === 'ready') {
      where.ready_for_sale = true
    } else if (ready === 'sorting') {
      where.ready_for_sale = false
    }

    if (slotId) {
      where.storage_slot_id = slotId
    } else if (zoneId) {
      where.storage_slot = { zone_id: zoneId }
    }

    const bags = await prisma.bag.findMany({
      where,
      include: {
        trip: {
          select: {
            id: true,
            vehicle_id: true,
          },
        },
        storage_slot: {
          include: {
            zone: {
              select: {
                id: true,
                zone_code: true,
                zone_name: true,
              },
            },
          },
        },
      },
      orderBy: [{ created_at: 'desc' }],
    })

    return NextResponse.json(bags)
  } catch (error) {
    console.error('Failed to fetch bags:', error)
    return NextResponse.json({ error: 'Failed to fetch bags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_UPDATE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = await request.json()
    const bag = await TripService.createBag(body)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.create',
      resource_type: 'bag',
      resource_id: bag.id,
      success: true,
      status_code: 200,
      metadata: {
        bag_code: bag.bag_code,
        trip_id: bag.trip_id,
      },
    })

    return NextResponse.json(bag)
  } catch (error) {
    console.error('Failed to create bag:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.create',
      resource_type: 'bag',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to create bag',
    })

    return NextResponse.json({ error: 'Failed to create bag' }, { status: 500 })
  }
}
