import { NextRequest, NextResponse } from 'next/server'
import { TripService } from '@/lib/trip-service'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
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
  const auth = await requirePermission(request, PERMISSIONS.SALES_DISPATCH)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as {
      note?: string | null
    }

    const payload = await TripService.cancelSaleOrder(id, {
      note: body.note ?? null,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'sales.cancel',
      resource_type: 'sale_order',
      resource_id: id,
      success: true,
      status_code: 200,
      metadata: {
        sale_no: payload.sale_no,
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to cancel sale order:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel sale order'
    const status = statusCodeFromError(error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'sales.cancel',
      resource_type: 'sale_order',
      success: false,
      status_code: status,
      message,
    })

    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
