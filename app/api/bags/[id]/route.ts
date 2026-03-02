import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const bag = await prisma.bag.findUnique({
      where: { id },
      include: {
        trip: {
          select: {
            id: true,
            vehicle_id: true,
            customer_factory: true,
            partner: {
              select: {
                name: true,
                factory_name: true,
              },
            },
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
        movements: {
          orderBy: { occurred_at: 'desc' },
          take: 20,
          include: {
            referenceBag: {
              select: {
                bag_code: true,
              },
            },
          },
        },
      },
    })

    if (!bag) {
      return NextResponse.json({ error: 'Bag not found' }, { status: 404 })
    }

    return NextResponse.json(bag)
  } catch (error) {
    console.error('Failed to fetch bag detail:', error)
    return NextResponse.json({ error: 'Failed to fetch bag detail' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_UPDATE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = await request.json()
    if (body.storage_slot_id === '') {
      body.storage_slot_id = null
    }
    const bag = await TripService.updateBag(id, body)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.update',
      resource_type: 'bag',
      resource_id: id,
      success: true,
      status_code: 200,
      metadata: body,
    })

    return NextResponse.json(bag)
  } catch (error) {
    console.error('Failed to update bag:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.update',
      resource_type: 'bag',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to update bag',
    })

    return NextResponse.json({ error: 'Failed to update bag' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_UPDATE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    await TripService.deleteBag(id)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.delete',
      resource_type: 'bag',
      resource_id: id,
      success: true,
      status_code: 200,
    })

    return NextResponse.json({ message: 'Bag deleted successfully' })
  } catch (error) {
    console.error('Failed to delete bag:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.delete',
      resource_type: 'bag',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to delete bag',
    })

    return NextResponse.json({ error: 'Failed to delete bag' }, { status: 500 })
  }
}
