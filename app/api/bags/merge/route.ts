import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function statusCodeFromError(error: unknown): number {
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('Validation:')) return 400
  return 500
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_SPLIT_MERGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = (await request.json()) as {
      source_bag_ids?: string[]
      note?: string | null
      ready_for_sale?: boolean
      storage_slot_id?: string | null
    }

    const payload = await TripService.mergeBags({
      source_bag_ids: Array.isArray(body.source_bag_ids) ? body.source_bag_ids : [],
      note: body.note ?? null,
      ready_for_sale: body.ready_for_sale,
      storage_slot_id:
        body.storage_slot_id === undefined ? undefined : body.storage_slot_id || null,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.merge',
      resource_type: 'bag',
      resource_id: payload.merged_bag.id,
      success: true,
      status_code: 200,
      metadata: {
        source_count: payload.source_bags.length,
        merged_bag_code: payload.merged_bag.bag_code,
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to merge bags:', error)
    const message = error instanceof Error ? error.message : 'Failed to merge bags'

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'bags.merge',
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
