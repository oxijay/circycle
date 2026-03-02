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

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.SALES_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const take = Number(request.nextUrl.searchParams.get('take') || 50)
    const rows = await TripService.getSaleOrders({ q, take })
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Failed to fetch sale orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sale orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.SALES_DISPATCH)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = (await request.json()) as {
      customer_name?: string
      note?: string | null
      sold_at?: string
      items?: Array<{
        bag_id?: string
        quantity?: number
        unit_price?: number
      }>
    }

    const payload = await TripService.createConfirmedSaleOrder({
      customer_name: String(body.customer_name ?? ''),
      note: body.note ?? null,
      sold_at: body.sold_at ? new Date(body.sold_at) : undefined,
      items: Array.isArray(body.items)
        ? body.items.map((item) => ({
            bag_id: String(item.bag_id ?? ''),
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
          }))
        : [],
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'sales.dispatch',
      resource_type: 'sale_order',
      resource_id: payload.id,
      success: true,
      status_code: 200,
      metadata: {
        sale_no: payload.sale_no,
        customer_name: payload.customer_name,
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to create sale order:', error)
    const message = error instanceof Error ? error.message : 'Failed to create sale order'
    const status = statusCodeFromError(error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'sales.dispatch',
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
