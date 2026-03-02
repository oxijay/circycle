import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { writeAuditLog } from '@/lib/security/audit-log'
import { PERMISSIONS } from '@/lib/security/permissions'

function parseRole(value: unknown): UserRole {
  if (value === 'WORKER') return 'WORKER'
  if (value === 'OFFICE') return 'OFFICE'
  if (value === 'EXECUTIVE') return 'EXECUTIVE'
  return 'ADMIN'
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.USERS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  const users = await prisma.appUser.findMany({
    orderBy: [{ is_active: 'desc' }, { role: 'asc' }, { employee_code: 'asc' }],
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.USERS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = (await request.json()) as {
      employee_code?: string
      display_name?: string
      role?: UserRole
    }

    const employeeCode = String(body.employee_code ?? '')
      .trim()
      .toUpperCase()
      .slice(0, 20)
    const displayName = String(body.display_name ?? '').trim().slice(0, 120)
    if (!employeeCode || !displayName) {
      return NextResponse.json(
        { error: 'employee_code and display_name are required' },
        { status: 400 }
      )
    }

    const created = await prisma.appUser.create({
      data: {
        employee_code: employeeCode,
        display_name: displayName,
        role: parseRole(body.role),
      },
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'users.create',
      resource_type: 'app_user',
      resource_id: created.id,
      success: true,
      status_code: 200,
      metadata: {
        employee_code: created.employee_code,
        role: created.role,
      },
    })

    return NextResponse.json(created)
  } catch (error) {
    console.error('Failed to create app user:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'users.create',
      resource_type: 'app_user',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to create app user',
    })

    return NextResponse.json({ error: 'Failed to create app user' }, { status: 500 })
  }
}

