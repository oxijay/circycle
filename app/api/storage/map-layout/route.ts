import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/security/audit-log'
import { requirePermission } from '@/lib/security/auth-context'
import { PERMISSIONS } from '@/lib/security/permissions'

const REGION_KEYS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'] as const
type RegionKey = (typeof REGION_KEYS)[number]

function isRegionKey(value: string): value is RegionKey {
  return (REGION_KEYS as readonly string[]).includes(value)
}

function normalizeZoneId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

async function ensureMapAssignmentTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "storage_zone_map_assignments" (
      "id" TEXT PRIMARY KEY,
      "region_key" TEXT NOT NULL UNIQUE,
      "zone_id" TEXT NOT NULL UNIQUE REFERENCES "storage_zones"("id") ON DELETE CASCADE,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

async function readAssignments(): Promise<Array<{ region_key: string; zone_id: string }>> {
  await ensureMapAssignmentTable()
  const rows = await prisma.$queryRaw<Array<{ region_key: string; zone_id: string }>>`
    SELECT "region_key", "zone_id"
    FROM "storage_zone_map_assignments"
    ORDER BY "region_key" ASC
  `
  return rows
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.BAGS_VIEW)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const assignments = await readAssignments()

    const byRegion = new Map(assignments.map((row) => [row.region_key, row.zone_id]))
    return NextResponse.json({
      assignments: REGION_KEYS.map((regionKey) => ({
        region_key: regionKey,
        zone_id: byRegion.get(regionKey) ?? null,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch storage map layout:', error)
    return NextResponse.json({ error: 'Failed to fetch storage map layout' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, PERMISSIONS.INVENTORY_LOCATIONS_MANAGE)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const body = (await request.json()) as {
      assignments?: Array<{
        region_key: string
        zone_id?: string | null
      }>
    }

    const rows = Array.isArray(body.assignments) ? body.assignments : null
    if (!rows) {
      return NextResponse.json(
        { error: 'Validation: assignments ต้องเป็น array' },
        { status: 400 }
      )
    }

    const regionSet = new Set<string>()
    const normalized = rows.map((row) => {
      const regionKey = String(row.region_key ?? '').trim().toUpperCase()
      if (!isRegionKey(regionKey)) {
        throw new Error(`Validation: region_key ไม่ถูกต้อง (${regionKey || '-'})`)
      }
      if (regionSet.has(regionKey)) {
        throw new Error(`Validation: region_key ซ้ำ (${regionKey})`)
      }
      regionSet.add(regionKey)

      return {
        region_key: regionKey,
        zone_id: normalizeZoneId(row.zone_id),
      }
    })

    const nonNullZoneIds = normalized
      .map((row) => row.zone_id)
      .filter((zoneId): zoneId is string => Boolean(zoneId))
    const zoneIds = Array.from(new Set(nonNullZoneIds))

    if (zoneIds.length > 0) {
      const existingZones = await prisma.storageZone.findMany({
        where: { id: { in: zoneIds } },
        select: { id: true },
      })
      if (existingZones.length !== zoneIds.length) {
        return NextResponse.json(
          { error: 'Validation: พบ zone_id ที่ไม่มีอยู่จริง' },
          { status: 400 }
        )
      }
    }

    if (zoneIds.length !== nonNullZoneIds.length) {
      return NextResponse.json(
        { error: 'Validation: zone_id ซ้ำกันในหลาย region' },
        { status: 400 }
      )
    }

    await ensureMapAssignmentTable()
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM "storage_zone_map_assignments"`

      const toCreate = normalized.filter((row) => row.zone_id)
      if (toCreate.length > 0) {
        for (const row of toCreate) {
          await tx.$executeRaw`
            INSERT INTO "storage_zone_map_assignments"
            ("id", "region_key", "zone_id", "created_at", "updated_at")
            VALUES (${randomUUID()}, ${row.region_key}, ${row.zone_id as string}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `
        }
      }
    })

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.map_layout.update',
      resource_type: 'storage_zone_map_assignment',
      success: true,
      status_code: 200,
      metadata: {
        assignments: normalized,
      },
    })

    return NextResponse.json({
      assignments: REGION_KEYS.map((regionKey) => ({
        region_key: regionKey,
        zone_id: normalized.find((row) => row.region_key === regionKey)?.zone_id ?? null,
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Validation:')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Failed to update storage map layout:', error)

    await writeAuditLog({
      actor: auth.actor,
      request,
      action: 'storage.map_layout.update',
      resource_type: 'storage_zone_map_assignment',
      success: false,
      status_code: 500,
      message: error instanceof Error ? error.message : 'Failed to update storage map layout',
    })

    return NextResponse.json({ error: 'Failed to update storage map layout' }, { status: 500 })
  }
}
