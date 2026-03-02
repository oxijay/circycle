import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.AUDIT_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() || ''
    const action = request.nextUrl.searchParams.get('action')?.trim() || ''
    const resourceType = request.nextUrl.searchParams.get('resource_type')?.trim() || ''
    const userId = request.nextUrl.searchParams.get('user_id')?.trim() || ''
    const take = Math.min(Math.max(Number(request.nextUrl.searchParams.get('take') || 200), 1), 500)

    const rows = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(resourceType ? { resource_type: resourceType } : {}),
        ...(userId ? { actor_user_id: userId } : {}),
        ...(q
          ? {
              OR: [
                { actor_name: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { resource_type: { contains: q, mode: 'insensitive' } },
                { resource_id: { contains: q, mode: 'insensitive' } },
                { message: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ created_at: 'desc' }],
      take,
      include: {
        actor: {
          select: {
            id: true,
            employee_code: true,
            display_name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

