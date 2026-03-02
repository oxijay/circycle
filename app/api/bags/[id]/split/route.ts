import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

type SplitItemInput = {
  weight?: number
  material?: string | null
  note?: string | null
  ready_for_sale?: boolean
  storage_slot_id?: string | null
}

function normalizeItems(body: {
  items?: SplitItemInput[]
  weights?: number[]
}): SplitItemInput[] {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
  }

  if (Array.isArray(body.weights) && body.weights.length > 0) {
    return body.weights.map((weight) => ({ weight }))
  }

  return []
}

function statusCodeFromError(error: unknown): number {
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('Validation:')) return 400
  return 500
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_SPLIT_MERGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = (await request.json()) as {
      items?: SplitItemInput[]
      weights?: number[]
      note?: string | null
    }

    const items = normalizeItems(body)
    const payload = await TripService.splitBag(id, {
      items: items.map((item) => ({
        weight: Number(item.weight) || 0,
        material: item.material ?? undefined,
        note: item.note ?? undefined,
        ready_for_sale: item.ready_for_sale,
        storage_slot_id: item.storage_slot_id ?? null,
      })),
      note: body.note ?? null,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.split',
      resource_type: 'bag',
      resource_id: id,
      success: true,
      status_code: 200,
      metadata: {
        created_bags: payload.created_bags.length,
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to split bag:', error)
    const message = error instanceof Error ? error.message : 'Failed to split bag'

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.split',
      resource_type: 'bag',
      success: false,
      status_code: statusCodeFromError(error),
      message,
    })

    return NextResponse.json(
      { error: message },
      { status: statusCodeFromError(error) }
    )
  }
}
