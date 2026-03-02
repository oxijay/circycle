import { NextRequest, NextResponse } from 'next/server'

import {
  attachActorCookie,
  AUTH_COOKIE_NAME,
  getUsersForContext,
  resolveActorFromRequest,
} from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'

export async function GET(request: NextRequest) {
  const users = await getUsersForContext()
  const currentUser = await resolveActorFromRequest(request)

  const response = NextResponse.json({
    current_user: currentUser,
    users,
    cookie_name: AUTH_COOKIE_NAME,
  })

  if (currentUser && request.cookies.get(AUTH_COOKIE_NAME)?.value !== currentUser.id) {
    attachActorCookie(response, currentUser.id)
  }

  return response
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    user_id?: string
  }
  const userId = String(body.user_id ?? '').trim()
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const users = await getUsersForContext()
  const nextUser = users.find((row) => row.id === userId)
  if (!nextUser) {
    return NextResponse.json({ error: 'user not found or inactive' }, { status: 404 })
  }

  const previousUser = await resolveActorFromRequest(request)

  const response = NextResponse.json({
    current_user: nextUser,
    users,
  })
  attachActorCookie(response, nextUser.id)

  await writeAuditLog({
    actor: previousUser,
    request,
    action: 'auth.switch_user',
    resource_type: 'app_user',
    resource_id: nextUser.id,
    success: true,
    status_code: 200,
    metadata: {
      from_user_id: previousUser?.id ?? null,
      to_user_id: nextUser.id,
    },
  })

  return response
}

