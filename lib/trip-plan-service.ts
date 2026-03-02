import { Partner, Prisma, Trip, TripPlan, TripPlanStatus, TripType } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type PartnerSnapshot = Pick<Partner, 'id' | 'name' | 'factory_name' | 'partner_type'>

type SupportsTripTypeInput = {
  partnerType: Partner['partner_type']
  tripType: TripType
}

export type TripPlanListFilters = {
  readyOnly?: boolean
  statuses?: TripPlanStatus[]
  limit?: number
}

export type TripPlanCreateInput = {
  tripType?: TripType
  plannedStartAt: Date
  vehicleId: string
  customerFactory: string
  partnerId?: string | null
  driverName?: string | null
  automilVehicleId?: string | null
  notes?: string | null
  status?: TripPlanStatus
  createdByUserId?: string | null
}

export type TripPlanUpdateInput = Partial<{
  tripType: TripType
  plannedStartAt: Date
  vehicleId: string
  customerFactory: string
  partnerId: string | null
  driverName: string | null
  automilVehicleId: string | null
  notes: string | null
  status: TripPlanStatus
}>

function validationError(message: string): never {
  throw new Error(`Validation: ${message}`)
}

function supportsTripType(input: SupportsTripTypeInput): boolean {
  if (input.partnerType === 'BOTH') return true
  if (input.tripType === 'INBOUND_PURCHASE') return input.partnerType === 'SUPPLIER'
  return input.partnerType === 'BUYER'
}

async function requirePartner(partnerId: string): Promise<PartnerSnapshot> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      factory_name: true,
      partner_type: true,
    },
  })

  if (!partner) validationError('ไม่พบคู่ค้า')
  return partner
}

function normalizeTripPlanStatus(value: TripPlanStatus | undefined): TripPlanStatus {
  if (value === 'DRAFT') return 'DRAFT'
  if (value === 'CANCELLED') return 'CANCELLED'
  if (value === 'OPENED') return 'OPENED'
  return 'SCHEDULED'
}

function sanitizeCoreFields(input: {
  vehicleId?: string | null
  customerFactory?: string | null
  driverName?: string | null
  notes?: string | null
}) {
  return {
    vehicleId: String(input.vehicleId ?? '')
      .trim()
      .slice(0, 120),
    customerFactory: String(input.customerFactory ?? '')
      .trim()
      .slice(0, 200),
    driverName: String(input.driverName ?? '')
      .trim()
      .slice(0, 120),
    notes: String(input.notes ?? '')
      .trim()
      .slice(0, 1000),
  }
}

function toDateOrThrow(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    validationError('วันที่นัดหมายไม่ถูกต้อง')
  }
  return date
}

type TripPlanWithPartner = TripPlan & {
  partner: Pick<Partner, 'id' | 'name' | 'factory_name'> | null
}

type TripPlanDelegateLike = {
  findMany: (...args: unknown[]) => Promise<TripPlan[]>
  create: (...args: unknown[]) => Promise<TripPlan>
  findUnique: (...args: unknown[]) => Promise<TripPlan | null>
  update: (...args: unknown[]) => Promise<TripPlan>
  updateMany: (...args: unknown[]) => Promise<{ count: number }>
  delete: (...args: unknown[]) => Promise<TripPlan>
}

function requireTripPlanDelegate(source: unknown): TripPlanDelegateLike {
  const delegate = (source as { tripPlan?: TripPlanDelegateLike } | null | undefined)?.tripPlan
  if (
    !delegate
    || typeof delegate.findMany !== 'function'
    || typeof delegate.create !== 'function'
    || typeof delegate.findUnique !== 'function'
    || typeof delegate.update !== 'function'
    || typeof delegate.updateMany !== 'function'
    || typeof delegate.delete !== 'function'
  ) {
    throw new Error(
      'Infrastructure: Prisma Client ยังไม่รองรับ TripPlan ใน process ปัจจุบัน กรุณา run `npx prisma generate` และ restart backend server'
    )
  }
  return delegate
}

type TripDelegateLike = {
  findFirst: (...args: unknown[]) => Promise<Trip | null>
}

function requireTripDelegate(source: unknown): TripDelegateLike {
  const delegate = (source as { trip?: TripDelegateLike } | null | undefined)?.trip
  if (!delegate || typeof delegate.findFirst !== 'function') {
    throw new Error('Infrastructure: Prisma Client ยังไม่พร้อมใช้งาน Trip delegate')
  }
  return delegate
}

const CLOSED_TRIP_STATUSES = ['COMPLETED', 'RECONCILED'] as const

function buildTripConflictMessage(kind: 'vehicle' | 'driver', value: string, conflict: {
  id: string
  status: Trip['status']
}): string {
  const tripCode = conflict.id.slice(-8).toUpperCase()
  if (kind === 'vehicle') {
    return `รถ "${value}" กำลังถูกใช้งานอยู่ในเที่ยว ${tripCode} (${conflict.status})`
  }
  return `คนขับ "${value}" กำลังถูกใช้งานอยู่ในเที่ยว ${tripCode} (${conflict.status})`
}

export class TripPlanService {
  static async listTripPlans(filters: TripPlanListFilters = {}): Promise<TripPlanWithPartner[]> {
    const where: Prisma.TripPlanWhereInput = {}
    const tripPlanRepo = requireTripPlanDelegate(prisma)

    if (filters.readyOnly) {
      where.status = 'SCHEDULED'
      where.opened_trip_id = null
      where.planned_start_at = { lte: new Date() }
    } else if (filters.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses }
    }

    const rows = await tripPlanRepo.findMany({
      where,
      orderBy: [{ planned_start_at: 'asc' }, { created_at: 'desc' }],
      take: Math.max(1, Math.min(filters.limit ?? 200, 500)),
    })

    const partnerIds = Array.from(
      new Set(rows.map((row) => row.partner_id).filter((id): id is string => Boolean(id)))
    )

    const partnerMap = new Map<string, Pick<Partner, 'id' | 'name' | 'factory_name'>>()
    if (partnerIds.length > 0) {
      const partners = await prisma.partner.findMany({
        where: { id: { in: partnerIds } },
        select: {
          id: true,
          name: true,
          factory_name: true,
        },
      })
      for (const partner of partners) partnerMap.set(partner.id, partner)
    }

    return rows.map((row) => ({
      ...row,
      partner: row.partner_id ? partnerMap.get(row.partner_id) ?? null : null,
    }))
  }

  static async createTripPlan(input: TripPlanCreateInput): Promise<TripPlanWithPartner> {
    const tripPlanRepo = requireTripPlanDelegate(prisma)
    const tripType = input.tripType ?? 'INBOUND_PURCHASE'
    const status = normalizeTripPlanStatus(input.status)
    const plannedStartAt = toDateOrThrow(input.plannedStartAt)
    const core = sanitizeCoreFields({
      vehicleId: input.vehicleId,
      customerFactory: input.customerFactory,
      driverName: input.driverName,
      notes: input.notes,
    })
    const partnerId = String(input.partnerId ?? '').trim() || null
    const automilVehicleId = String(input.automilVehicleId ?? '')
      .trim()
      .slice(0, 80)

    let partner: PartnerSnapshot | null = null
    if (partnerId) {
      partner = await requirePartner(partnerId)
      if (!supportsTripType({ partnerType: partner.partner_type, tripType })) {
        validationError('ประเภทคู่ค้าไม่รองรับกับประเภทเที่ยว')
      }
    }

    const customerFactory =
      core.customerFactory || partner?.factory_name?.trim() || partner?.name?.trim() || ''

    if (status !== 'DRAFT') {
      if (!core.vehicleId) validationError('กรุณาระบุทะเบียนรถ')
      if (!customerFactory) validationError('กรุณาระบุโรงงาน/จุดหมาย')
    }

    const created = await tripPlanRepo.create({
      data: {
        trip_type: tripType,
        planned_start_at: plannedStartAt,
        vehicle_id: core.vehicleId,
        partner_id: partnerId,
        customer_factory: customerFactory,
        driver_name: core.driverName || null,
        automil_vehicle_id: automilVehicleId || null,
        notes: core.notes || null,
        status,
        created_by_user_id: input.createdByUserId ?? null,
      },
    })

    return {
      ...created,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            factory_name: partner.factory_name,
          }
        : null,
    }
  }

  static async updateTripPlan(id: string, input: TripPlanUpdateInput): Promise<TripPlanWithPartner> {
    const tripPlanRepo = requireTripPlanDelegate(prisma)
    const current = await tripPlanRepo.findUnique({
      where: { id },
    })
    if (!current) {
      throw new Error('NotFound: Trip plan not found')
    }

    if (current.status === 'OPENED') {
      validationError('แผนที่เปิดงานแล้ว ไม่สามารถแก้ไขได้')
    }

    const nextTripType = input.tripType ?? current.trip_type
    const nextStatus = input.status ? normalizeTripPlanStatus(input.status) : current.status
    const nextPartnerId =
      input.partnerId !== undefined ? String(input.partnerId ?? '').trim() || null : current.partner_id
    const nextAutomilVehicleId =
      input.automilVehicleId !== undefined
        ? String(input.automilVehicleId ?? '')
            .trim()
            .slice(0, 80) || null
        : current.automil_vehicle_id

    const core = sanitizeCoreFields({
      vehicleId: input.vehicleId ?? current.vehicle_id,
      customerFactory: input.customerFactory ?? current.customer_factory,
      driverName:
        input.driverName !== undefined ? input.driverName : current.driver_name,
      notes: input.notes !== undefined ? input.notes : current.notes,
    })
    const plannedStartAt = input.plannedStartAt
      ? toDateOrThrow(input.plannedStartAt)
      : current.planned_start_at

    let partner: PartnerSnapshot | null = null
    if (nextPartnerId) {
      partner = await requirePartner(nextPartnerId)
      if (!supportsTripType({ partnerType: partner.partner_type, tripType: nextTripType })) {
        validationError('ประเภทคู่ค้าไม่รองรับกับประเภทเที่ยว')
      }
    }

    const customerFactory =
      core.customerFactory || partner?.factory_name?.trim() || partner?.name?.trim() || ''
    if (nextStatus !== 'DRAFT') {
      if (!core.vehicleId) validationError('กรุณาระบุทะเบียนรถ')
      if (!customerFactory) validationError('กรุณาระบุโรงงาน/จุดหมาย')
    }

    const updated = await tripPlanRepo.update({
      where: { id },
      data: {
        trip_type: nextTripType,
        planned_start_at: plannedStartAt,
        vehicle_id: core.vehicleId,
        partner_id: nextPartnerId,
        customer_factory: customerFactory,
        driver_name: core.driverName || null,
        automil_vehicle_id: nextAutomilVehicleId,
        notes: core.notes || null,
        status: nextStatus,
      },
    })

    return {
      ...updated,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            factory_name: partner.factory_name,
          }
        : nextPartnerId
          ? await prisma.partner.findUnique({
              where: { id: nextPartnerId },
              select: { id: true, name: true, factory_name: true },
            })
          : null,
    }
  }

  static async openTripPlan(id: string, actorUserId: string | null): Promise<{
    tripPlan: TripPlan
    trip: Trip
  }> {
    return prisma.$transaction(async (tx) => {
      const tripPlanRepo = requireTripPlanDelegate(tx)
      const tripRepo = requireTripDelegate(tx)
      const plan = await tripPlanRepo.findUnique({ where: { id } })
      if (!plan) throw new Error('NotFound: Trip plan not found')

      if (plan.status === 'CANCELLED') {
        validationError('แผนนี้ถูกยกเลิกแล้ว')
      }
      if (plan.status === 'OPENED' || plan.opened_trip_id) {
        validationError('แผนนี้ถูกเปิดงานไปแล้ว')
      }

      const vehicleId = String(plan.vehicle_id ?? '').trim()
      const customerFactory = String(plan.customer_factory ?? '').trim()
      const driverName = String(plan.driver_name ?? '').trim()
      const automilVehicleId = String(plan.automil_vehicle_id ?? '').trim()
      if (!vehicleId) validationError('แผนยังไม่มีทะเบียนรถ')
      if (!customerFactory) validationError('แผนยังไม่มีโรงงาน/จุดหมาย')

      if (plan.partner_id) {
        const partner = await tx.partner.findUnique({
          where: { id: plan.partner_id },
          select: {
            id: true,
            partner_type: true,
          },
        })
        if (!partner) validationError('ไม่พบคู่ค้าของแผนนี้')
        if (!supportsTripType({ partnerType: partner.partner_type, tripType: plan.trip_type })) {
          validationError('ประเภทคู่ค้าไม่รองรับกับประเภทเที่ยว')
        }
      }

      const baseTripWhere: Prisma.TripWhereInput = {
        status: { notIn: [...CLOSED_TRIP_STATUSES] },
      }
      if (automilVehicleId) {
        const sameVehicleByAutomil = await tripRepo.findFirst({
          where: {
            ...baseTripWhere,
            automil_vehicle_id: automilVehicleId,
          },
          select: {
            id: true,
            status: true,
          },
        })
        if (sameVehicleByAutomil) {
          validationError(
            buildTripConflictMessage('vehicle', vehicleId || automilVehicleId, sameVehicleByAutomil)
          )
        }
      }
      if (vehicleId) {
        const sameVehicle = await tripRepo.findFirst({
          where: {
            ...baseTripWhere,
            vehicle_id: { equals: vehicleId, mode: 'insensitive' },
          },
          select: {
            id: true,
            status: true,
          },
        })
        if (sameVehicle) {
          validationError(buildTripConflictMessage('vehicle', vehicleId, sameVehicle))
        }
      }
      if (driverName) {
        const sameDriver = await tripRepo.findFirst({
          where: {
            ...baseTripWhere,
            driver_name: { equals: driverName, mode: 'insensitive' },
          },
          select: {
            id: true,
            status: true,
          },
        })
        if (sameDriver) {
          validationError(buildTripConflictMessage('driver', driverName, sameDriver))
        }
      }

      const trip = await tx.trip.create({
        data: {
          vehicle_id: vehicleId,
          trip_type: plan.trip_type,
          partner_id: plan.partner_id,
          automil_vehicle_id: plan.automil_vehicle_id,
          driver_name: plan.driver_name,
          customer_factory: customerFactory,
          status: 'PENDING',
        },
      })

      const openedAt = new Date()
      const updateResult = await tripPlanRepo.updateMany({
        where: {
          id: plan.id,
          status: {
            in: ['DRAFT', 'SCHEDULED'],
          },
          opened_trip_id: null,
        },
        data: {
          status: 'OPENED',
          opened_at: openedAt,
          opened_trip_id: trip.id,
          opened_by_user_id: actorUserId,
        },
      })

      if (updateResult.count !== 1) {
        throw new Error('Validation: แผนนี้ถูกเปิดงานไปแล้ว')
      }

      const updatedPlan = await tripPlanRepo.findUnique({ where: { id: plan.id } })
      if (!updatedPlan) throw new Error('NotFound: Trip plan not found')

      return {
        tripPlan: updatedPlan,
        trip,
      }
    })
  }

  static async deleteTripPlan(id: string): Promise<TripPlan> {
    const tripPlanRepo = requireTripPlanDelegate(prisma)
    const current = await tripPlanRepo.findUnique({ where: { id } })
    if (!current) {
      throw new Error('NotFound: Trip plan not found')
    }

    if (current.status === 'OPENED' || current.opened_trip_id) {
      validationError('แผนที่เปิดงานแล้ว ไม่สามารถลบได้')
    }

    return tripPlanRepo.delete({ where: { id } })
  }
}
