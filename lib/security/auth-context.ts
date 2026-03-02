import { AppUser, UserRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/security/permissions'

export const AUTH_COOKIE_NAME = 'circycle_uid'

type PublicUser = Pick<AppUser, 'id' | 'employee_code' | 'display_name' | 'role' | 'is_active'>

const DEFAULT_USERS: Array<{
  employee_code: string
  display_name: string
  role: UserRole
}> = [
  { employee_code: 'WK001', display_name: 'Worker Demo', role: 'WORKER' },
  { employee_code: 'OF001', display_name: 'Office Demo', role: 'OFFICE' },
  { employee_code: 'EX001', display_name: 'Executive Demo', role: 'EXECUTIVE' },
  { employee_code: 'AD001', display_name: 'Admin Demo', role: 'ADMIN' },
]

let bootstrappedUsers = false

function readCookieValue(rawCookieHeader: string | null, key: string): string | null {
  if (!rawCookieHeader) return null
  const pairs = rawCookieHeader.split(';')
  for (const pair of pairs) {
    const [cookieKey, ...rest] = pair.trim().split('=')
    if (cookieKey !== key) continue
    return decodeURIComponent(rest.join('=') || '')
  }
  return null
}

function roleRank(role: UserRole): number {
  if (role === 'OFFICE') return 1
  if (role === 'ADMIN') return 2
  if (role === 'EXECUTIVE') return 3
  return 4
}

async function ensureDefaultUsers() {
  if (bootstrappedUsers) return

  const total = await prisma.appUser.count()
  if (total === 0) {
    await prisma.appUser.createMany({
      data: DEFAULT_USERS.map((row) => ({
        employee_code: row.employee_code,
        display_name: row.display_name,
        role: row.role,
        is_active: true,
      })),
    })
  }

  bootstrappedUsers = true
}

export async function getUsersForContext(): Promise<PublicUser[]> {
  await ensureDefaultUsers()
  const users = await prisma.appUser.findMany({
    where: { is_active: true },
    select: {
      id: true,
      employee_code: true,
      display_name: true,
      role: true,
      is_active: true,
    },
  })
  return users.sort((a, b) => {
    const rankDiff = roleRank(a.role) - roleRank(b.role)
    if (rankDiff !== 0) return rankDiff
    return a.employee_code.localeCompare(b.employee_code)
  })
}

export async function resolveActorFromRequest(
  request: NextRequest | Request
): Promise<PublicUser | null> {
  await ensureDefaultUsers()

  const cookieUserId = request instanceof NextRequest
    ? request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null
    : readCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME)
  const headerUserId = request.headers.get('x-user-id')
  const userId = (cookieUserId || headerUserId || '').trim()

  if (userId) {
    const byId = await prisma.appUser.findFirst({
      where: {
        id: userId,
        is_active: true,
      },
      select: {
        id: true,
        employee_code: true,
        display_name: true,
        role: true,
        is_active: true,
      },
    })
    if (byId) return byId
  }

  const users = await getUsersForContext()
  return users[0] ?? null
}

export function attachActorCookie(response: NextResponse, userId: string) {
  response.cookies.set(AUTH_COOKIE_NAME, userId, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function requirePermission(
  request: NextRequest | Request,
  permission: Permission
): Promise<{ actor: PublicUser; errorResponse: null } | { actor: null; errorResponse: NextResponse }> {
  const actor = await resolveActorFromRequest(request)
  if (!actor) {
    return {
      actor: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!hasPermission(actor.role, permission)) {
    return {
      actor: null,
      errorResponse: NextResponse.json(
        {
          error: `Forbidden: permission "${permission}" required`,
          actor: {
            id: actor.id,
            role: actor.role,
          },
        },
        { status: 403 }
      ),
    }
  }

  return { actor, errorResponse: null }
}
