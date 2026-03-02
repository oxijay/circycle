import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type ActionType = 'ACK' | 'UNACK' | 'ASSIGN' | 'UNASSIGN'

type RequestBody = {
  alert_key?: string
  action_type?: ActionType | string
  assigned_user_id?: string | null
}

const ACTION_MAP: Record<ActionType, string> = {
  ACK: 'alerts.ack',
  UNACK: 'alerts.unack',
  ASSIGN: 'alerts.assign',
  UNASSIGN: 'alerts.unassign',
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.TRIPS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody
    const alertKey = String(body.alert_key ?? '').trim()
    const actionType = String(body.action_type ?? '').trim().toUpperCase() as ActionType

    if (!alertKey) {
      return NextResponse.json({ error: 'Validation: alert_key is required' }, { status: 400 })
    }
    if (!Object.keys(ACTION_MAP).includes(actionType)) {
      return NextResponse.json({ error: 'Validation: action_type is invalid' }, { status: 400 })
    }

    let assignedUser: {
      id: string
      display_name: string
      employee_code: string
    } | null = null

    if (actionType === 'ASSIGN') {
      const assignedUserId = String(body.assigned_user_id ?? '').trim()
      if (!assignedUserId) {
        return NextResponse.json(
          { error: 'Validation: assigned_user_id is required for ASSIGN' },
          { status: 400 }
        )
      }

      assignedUser = await prisma.appUser.findFirst({
        where: {
          id: assignedUserId,
          is_active: true,
        },
        select: {
          id: true,
          display_name: true,
          employee_code: true,
        },
      })

      if (!assignedUser) {
        return NextResponse.json({ error: 'Validation: assigned user not found' }, { status: 400 })
      }
    }

    const action = ACTION_MAP[actionType]
    await writeAuditLog({
      actor: auth.actor,
      request,
      action,
      resource_type: 'alert',
      resource_id: alertKey,
      success: true,
      status_code: 200,
      metadata:
        actionType === 'ASSIGN'
          ? {
              assigned_user_id: assignedUser?.id,
              assigned_user_name: assignedUser?.display_name,
              assigned_user_code: assignedUser?.employee_code,
            }
          : null,
    })

    return NextResponse.json({
      success: true,
      alert_key: alertKey,
      action_type: actionType,
      assigned_user: assignedUser,
    })
  } catch (error) {
    console.error('Failed to update alert action:', error)
    return NextResponse.json({ error: 'Failed to update alert action' }, { status: 500 })
  }
}
