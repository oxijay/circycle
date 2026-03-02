import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

function parseRole(value: unknown): UserRole {
  if (value === 'WORKER') return 'WORKER'
  if (value === 'OFFICE') return 'OFFICE'
  if (value === 'EXECUTIVE') return 'EXECUTIVE'
  return 'ADMIN'
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission(request, PERMISSIONS.USERS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const { id } = await params
    const body = (await request.json()) as {
      display_name?: string
      role?: UserRole
      is_active?: boolean
    }

    const payload = {
      ...(body.display_name !== undefined
        ? { display_name: String(body.display_name ?? '').trim().slice(0, 120) }
        : {}),
      ...(body.role !== undefined ? { role: parseRole(body.role) } : {}),
      ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
    }

    const updated = await prisma.appUser.update({
      where: { id },
      data: payload,
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'users.update',
      resource_type: 'app_user',
      resource_id: id,
      success: true,
      status_code: 200,
      metadata: payload,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update app user:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'users.update',
      resource_type: 'app_user',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to update app user',
    })

    return NextResponse.json({ error: 'Failed to update app user' }, { status: 500 })
  }
}

