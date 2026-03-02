import { Prisma, UserRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type ActorSnapshot = {
  id: string
  display_name: string
  role: UserRole
}

type AuditInput = {
  actor?: ActorSnapshot | null
  request: Request
  action: string
  resource_type: string
  resource_id?: string | null
  success: boolean
  status_code: number
  message?: string | null
  metadata?: Prisma.InputJsonValue | null
}

function getIpAddress(request: Request): string | null {
  const forwardFor = request.headers.get('x-forwarded-for')
  if (forwardFor) {
    const first = forwardFor.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || null
}

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actor_user_id: input.actor?.id ?? null,
        actor_name: input.actor?.display_name ?? null,
        actor_role: input.actor?.role ?? null,
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id ?? null,
        method: requestMethod(input.request),
        path: requestPath(input.request),
        success: input.success,
        status_code: input.status_code,
        message: input.message ?? null,
        ip_address: getIpAddress(input.request),
        user_agent: input.request.headers.get('user-agent') || null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

function requestMethod(request: Request): string {
  return request.method?.toUpperCase() || 'GET'
}

function requestPath(request: Request): string {
  try {
    const url = new URL(request.url)
    return `${url.pathname}${url.search}`
  } catch {
    return request.url
  }
}
