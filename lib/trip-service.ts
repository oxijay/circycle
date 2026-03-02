import {
  Bag,
  BagMovement,
  BagMovementType,
  BagStatus,
  Partner,
  PartnerType,
  Prisma,
  Trip,
  TripMaterial,
  TripStatus,
  TripType,
} from '@prisma/client'
import { prisma } from './prisma'

export type TripWithRelations = Trip & {
  bags: Bag[]
  materials: TripMaterial[]
  partner: Partner | null
}
export type TripListScope = 'active' | 'history'
export type TripListResult = {
  items: TripWithRelations[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
export type StaleTripCleanupResult = {
  scanned: number
  protectedByPlan: number
  deleted: number
  deletedIds: string[]
}
const MAX_TRIP_MATERIAL_ROWS = 10
const BAG_CODE_PREFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const MAX_BAG_CODE_NUMBER = 999

const TODAY_START = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const TODAY_END = () => {
  const start = TODAY_START()
  return new Date(start.getTime() + 24 * 60 * 60 * 1000)
}

function supportsTripType(partnerType: PartnerType, tripType: TripType) {
  if (partnerType === 'BOTH') return true
  if (tripType === 'INBOUND_PURCHASE') return partnerType === 'SUPPLIER'
  return partnerType === 'BUYER'
}

export class TripService {
  private static readonly CLOSED_TRIP_STATUSES: TripStatus[] = ['COMPLETED', 'RECONCILED']

  private static buildConflictMessage(kind: 'vehicle' | 'driver', value: string, conflict: {
    id: string
    status: TripStatus
    vehicle_id: string
    driver_name: string | null
  }): string {
    const tripCode = conflict.id.slice(-8).toUpperCase()
    const statusLabel = conflict.status
    if (kind === 'vehicle') {
      return `Validation: รถ "${value}" กำลังถูกใช้งานอยู่ในเที่ยว ${tripCode} (${statusLabel})`
    }
    return `Validation: คนขับ "${value}" กำลังถูกใช้งานอยู่ในเที่ยว ${tripCode} (${statusLabel})`
  }

  private static async assertNoActiveTripConflict(input: {
    vehicleId?: string | null
    driverName?: string | null
    automilVehicleId?: string | null
    excludeTripId?: string
  }) {
    const vehicleId = String(input.vehicleId ?? '').trim()
    const driverName = String(input.driverName ?? '').trim()
    const automilVehicleId = String(input.automilVehicleId ?? '').trim()
    const excludeTripId = String(input.excludeTripId ?? '').trim()
    const baseWhere: Prisma.TripWhereInput = {
      status: { notIn: this.CLOSED_TRIP_STATUSES },
      ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
    }

    if (automilVehicleId) {
      const sameVehicleByAutomil = await prisma.trip.findFirst({
        where: {
          ...baseWhere,
          automil_vehicle_id: automilVehicleId,
        },
        select: {
          id: true,
          status: true,
          vehicle_id: true,
          driver_name: true,
        },
      })
      if (sameVehicleByAutomil) {
        throw new Error(
          this.buildConflictMessage('vehicle', vehicleId || automilVehicleId, sameVehicleByAutomil)
        )
      }
    }

    if (vehicleId) {
      const sameVehicle = await prisma.trip.findFirst({
        where: {
          ...baseWhere,
          vehicle_id: { equals: vehicleId, mode: 'insensitive' },
        },
        select: {
          id: true,
          status: true,
          vehicle_id: true,
          driver_name: true,
        },
      })
      if (sameVehicle) {
        throw new Error(this.buildConflictMessage('vehicle', vehicleId, sameVehicle))
      }
    }

    if (driverName) {
      const sameDriver = await prisma.trip.findFirst({
        where: {
          ...baseWhere,
          driver_name: { equals: driverName, mode: 'insensitive' },
        },
        select: {
          id: true,
          status: true,
          vehicle_id: true,
          driver_name: true,
        },
      })
      if (sameDriver) {
        throw new Error(this.buildConflictMessage('driver', driverName, sameDriver))
      }
    }
  }

  private static async allocateBagCodes(count: number): Promise<string[]> {
    if (count <= 0) return []

    const activeBags = await prisma.bag.findMany({
      where: {
        status: {
          in: ['OPEN', 'PARTIAL'],
        },
      },
      select: {
        bag_code: true,
      },
    })

    const usedCodes = new Set<string>()
    for (const bag of activeBags) {
      const code = String(bag.bag_code ?? '').trim().toUpperCase()
      if (!/^[A-Z]\d{3}$/.test(code)) continue
      const numeric = Number.parseInt(code.slice(1), 10)
      if (Number.isNaN(numeric) || numeric < 1 || numeric > MAX_BAG_CODE_NUMBER) continue
      usedCodes.add(code)
    }

    const results: string[] = []
    for (const prefix of BAG_CODE_PREFIXES) {
      for (let code = 1; code <= MAX_BAG_CODE_NUMBER; code += 1) {
        const bagCode = `${prefix}${String(code).padStart(3, '0')}`
        if (usedCodes.has(bagCode)) continue
        usedCodes.add(bagCode)
        results.push(bagCode)
        if (results.length === count) return results
      }
    }

    throw new Error(
      `Validation: Bag code exhausted (max ${BAG_CODE_PREFIXES.length * MAX_BAG_CODE_NUMBER} active bags)`
    )
  }

  static async createTrip(data: {
    vehicleId: string
    customerFactory: string
    tripType?: TripType
    partnerId?: string | null
    driverName?: string
    automilVehicleId?: string
    automilDriverId?: string
  }): Promise<Trip> {
    const tripType = data.tripType ?? 'INBOUND_PURCHASE'
    const vehicleId = String(data.vehicleId ?? '').trim()
    const driverName = String(data.driverName ?? '').trim()
    const automilVehicleId = String(data.automilVehicleId ?? '').trim()
    let partner: Pick<Partner, 'id' | 'name' | 'factory_name' | 'partner_type'> | null =
      null

    if (data.partnerId) {
      partner = await prisma.partner.findUnique({
        where: { id: data.partnerId },
        select: {
          id: true,
          name: true,
          factory_name: true,
          partner_type: true,
        },
      })

      if (!partner) {
        throw new Error('Partner not found')
      }

      if (!supportsTripType(partner.partner_type, tripType)) {
        throw new Error('Partner type does not match trip type')
      }
    }

    const customerFactory =
      data.customerFactory.trim() ||
      partner?.factory_name?.trim() ||
      partner?.name?.trim() ||
      ''

    await this.assertNoActiveTripConflict({
      vehicleId,
      driverName,
      automilVehicleId,
    })

    return prisma.trip.create({
      data: {
        vehicle_id: vehicleId,
        trip_type: tripType,
        partner_id: partner?.id ?? null,
        automil_vehicle_id: automilVehicleId || null,
        driver_name: driverName || null,
        automil_driver_id: data.automilDriverId,
        customer_factory: customerFactory,
        status: 'PENDING',
      },
    })
  }

  static async updateTrip(
    id: string,
    data: Partial<{
      vehicle_id: string
      trip_type: TripType
      partner_id: string | null
      automil_vehicle_id: string | null
      driver_name: string | null
      automil_driver_id: string | null
      customer_factory: string
      departure_time: Date
      arrival_time: Date | null
      return_time: Date | null
      departed_plant_at: Date | null
      arrived_customer_at: Date | null
      departed_customer_at: Date | null
      arrived_plant_at: Date | null
      initial_weight: number
      final_weight: number
      empty_weight_out: number
      customer_reported_weight: number
      loaded_weight_in: number
      empty_weight_after_unload: number
      notes: string | null
      inbound_removed_at: Date | string | null
      inbound_removed_reason: string | null
      status: TripStatus
    }>
  ): Promise<Trip> {
    const currentTrip = await prisma.trip.findUnique({
      where: { id },
      select: {
        trip_type: true,
        partner_id: true,
        vehicle_id: true,
        automil_vehicle_id: true,
        driver_name: true,
        status: true,
        customer_factory: true,
        initial_weight: true,
        final_weight: true,
        loaded_weight_in: true,
        empty_weight_after_unload: true,
        customer_reported_weight: true,
      },
    })

    if (!currentTrip) {
      throw new Error('Trip not found')
    }

    const initialWeight = data.initial_weight ?? currentTrip.initial_weight
    const finalWeight = data.final_weight ?? currentTrip.final_weight
    const loadedWeightIn = data.loaded_weight_in ?? currentTrip.loaded_weight_in
    const emptyWeightAfterUnload =
      data.empty_weight_after_unload ?? currentTrip.empty_weight_after_unload
    const customerReportedWeight =
      data.customer_reported_weight ?? currentTrip.customer_reported_weight

    const weightDifference = finalWeight - initialWeight
    const ourNetWeight = loadedWeightIn - emptyWeightAfterUnload
    const weightVariance = ourNetWeight - customerReportedWeight
    const weightVariancePct =
      customerReportedWeight > 0
        ? (weightVariance / customerReportedWeight) * 100
        : 0

    const updatePayload = { ...data }
    const nextTripType = updatePayload.trip_type ?? currentTrip.trip_type
    const nextStatus = updatePayload.status ?? currentTrip.status
    const nextPartnerId =
      updatePayload.partner_id !== undefined
        ? updatePayload.partner_id
        : currentTrip.partner_id
    const nextVehicleId = String(
      updatePayload.vehicle_id !== undefined ? updatePayload.vehicle_id : currentTrip.vehicle_id
    ).trim()
    const nextDriverName = String(
      updatePayload.driver_name !== undefined
        ? updatePayload.driver_name ?? ''
        : currentTrip.driver_name ?? ''
    ).trim()
    const nextAutomilVehicleId = String(
      updatePayload.automil_vehicle_id !== undefined
        ? updatePayload.automil_vehicle_id ?? ''
        : currentTrip.automil_vehicle_id ?? ''
    ).trim()

    if (nextPartnerId) {
      const partner = await prisma.partner.findUnique({
        where: { id: nextPartnerId },
        select: {
          id: true,
          name: true,
          factory_name: true,
          partner_type: true,
        },
      })

      if (!partner) {
        throw new Error('Partner not found')
      }

      if (!supportsTripType(partner.partner_type, nextTripType)) {
        throw new Error('Partner type does not match trip type')
      }

      const customerFactory = (updatePayload.customer_factory ?? '').trim()
      if (!customerFactory) {
        updatePayload.customer_factory = partner.factory_name || partner.name
      }
    }

    if (!this.CLOSED_TRIP_STATUSES.includes(nextStatus)) {
      await this.assertNoActiveTripConflict({
        vehicleId: nextVehicleId,
        driverName: nextDriverName,
        automilVehicleId: nextAutomilVehicleId,
        excludeTripId: id,
      })
    }

    return prisma.trip.update({
      where: { id },
      data: {
        ...updatePayload,
        weight_difference: weightDifference,
        our_net_weight: ourNetWeight,
        weight_variance: weightVariance,
        weight_variance_pct: weightVariancePct,
      },
    })
  }

  static async getAllTripsWithBags(): Promise<TripWithRelations[]> {
    return prisma.trip.findMany({
      include: {
        bags: true,
        materials: true,
        partner: true,
      },
      orderBy: { created_at: 'desc' },
    })
  }

  static async listTrips(input: {
    scope: TripListScope
    page?: number
    pageSize?: number
  }): Promise<TripListResult> {
    const page = Math.max(1, Math.floor(Number(input.page) || 1))
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(input.pageSize) || 20)))
    const where: Prisma.TripWhereInput =
      input.scope === 'history'
        ? { status: { in: this.CLOSED_TRIP_STATUSES } }
        : { status: { notIn: this.CLOSED_TRIP_STATUSES } }

    const [total, items] = await prisma.$transaction([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        include: {
          bags: true,
          materials: true,
          partner: true,
        },
        orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  static async getTripWithBags(id: string): Promise<TripWithRelations | null> {
    return prisma.trip.findUnique({
      where: { id },
      include: {
        bags: true,
        materials: true,
        partner: true,
      },
    })
  }

  static async deleteInboundRemovedTrip(id: string): Promise<Trip> {
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: {
        id: true,
        trip_type: true,
        status: true,
        inbound_removed_at: true,
      },
    })

    if (!trip) {
      throw new Error('NotFound: Trip not found')
    }

    if (trip.trip_type !== 'INBOUND_PURCHASE') {
      throw new Error('Validation: ลบถาวรได้เฉพาะเที่ยว Inbound เท่านั้น')
    }

    if (!trip.inbound_removed_at) {
      throw new Error('Validation: เที่ยวนี้ยังไม่ได้ถูกนำออกจากคิว Inbound')
    }

    if (trip.status !== 'RECONCILED' && trip.status !== 'PACKING') {
      throw new Error('Validation: ลบถาวรได้เฉพาะเที่ยวที่อยู่สถานะรอ/กำลังลงเป้')
    }

    const [bagCount, openedPlanCount] = await Promise.all([
      prisma.bag.count({ where: { trip_id: id } }),
      prisma.tripPlan.count({ where: { opened_trip_id: id } }),
    ])

    if (bagCount > 0) {
      throw new Error('Validation: เที่ยวนี้มีรายการเป้แล้ว ไม่สามารถลบถาวรได้')
    }

    if (openedPlanCount > 0) {
      throw new Error('Validation: เที่ยวนี้ผูกกับแผนล่วงหน้าอยู่ ไม่สามารถลบถาวรได้')
    }

    return prisma.trip.delete({ where: { id } })
  }

  static async cleanupStaleActiveTrips(input?: {
    olderThanDays?: number
  }): Promise<StaleTripCleanupResult> {
    const olderThanDays = Math.max(0, Math.floor(Number(input?.olderThanDays) || 30))
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    const staleTrips = await prisma.trip.findMany({
      where: {
        status: { notIn: this.CLOSED_TRIP_STATUSES },
        updated_at: { lt: cutoff },
      },
      select: { id: true },
    })
    const staleIds = staleTrips.map((trip) => trip.id)
    if (staleIds.length === 0) {
      return {
        scanned: 0,
        protectedByPlan: 0,
        deleted: 0,
        deletedIds: [],
      }
    }

    const linkedPlans = await prisma.tripPlan.findMany({
      where: { opened_trip_id: { in: staleIds } },
      select: { opened_trip_id: true },
    })
    const protectedIds = new Set(
      linkedPlans
        .map((plan) => String(plan.opened_trip_id ?? '').trim())
        .filter((id): id is string => Boolean(id))
    )

    const deletableIds = staleIds.filter((id) => !protectedIds.has(id))
    let deleted = 0
    if (deletableIds.length > 0) {
      const result = await prisma.trip.deleteMany({
        where: { id: { in: deletableIds } },
      })
      deleted = result.count
    }

    return {
      scanned: staleIds.length,
      protectedByPlan: protectedIds.size,
      deleted,
      deletedIds: deletableIds,
    }
  }

  static async upsertTripMaterials(
    tripId: string,
    items: Array<{
      id?: string
      material_type: string
      customer_weight?: number
      received_weight?: number
      bagged_weight?: number
    }>
  ): Promise<TripMaterial[]> {
    if (items.length > MAX_TRIP_MATERIAL_ROWS) {
      throw new Error(`Validation: Material rows exceed ${MAX_TRIP_MATERIAL_ROWS} items`)
    }

    const normalizedItems = items.map((item) => {
      const materialType = item.material_type.trim()
      const customerWeight = Math.max(0, Math.round(Number(item.customer_weight) || 0))
      const receivedWeight = Math.max(0, Math.round(Number(item.received_weight) || 0))
      const baggedWeight = Math.max(0, Math.round(Number(item.bagged_weight) || 0))

      if (!materialType || customerWeight <= 0) {
        throw new Error('Validation: material_type and customer_weight are required')
      }

      return {
        id: item.id,
        material_type: materialType,
        customer_weight: customerWeight,
        received_weight: receivedWeight,
        bagged_weight: baggedWeight,
      }
    })
    const existingMaterials = await prisma.tripMaterial.findMany({
      where: { trip_id: tripId },
      select: { id: true },
    })
    const existingIds = new Set(existingMaterials.map((item) => item.id))

    await prisma.$transaction(async (tx) => {
      const savedItems: TripMaterial[] = []

      for (const item of normalizedItems) {
        if (item.id) {
          if (!existingIds.has(item.id)) {
            throw new Error('Validation: material id does not belong to this trip')
          }

          const updated = await tx.tripMaterial.update({
            where: { id: item.id },
            data: {
              material_type: item.material_type,
              customer_weight: item.customer_weight ?? 0,
              received_weight: item.received_weight ?? 0,
              bagged_weight: item.bagged_weight ?? 0,
            },
          })
          savedItems.push(updated)
          continue
        }

        const created = await tx.tripMaterial.create({
          data: {
            trip_id: tripId,
            material_type: item.material_type,
            customer_weight: item.customer_weight ?? 0,
            received_weight: item.received_weight ?? 0,
            bagged_weight: item.bagged_weight ?? 0,
          },
        })
        savedItems.push(created)
      }

      const keepIds = new Set(savedItems.map((item) => item.id))
      const idsToDelete = [...existingIds].filter((id) => !keepIds.has(id))

      if (idsToDelete.length > 0) {
        await tx.tripMaterial.deleteMany({
          where: {
            trip_id: tripId,
            id: { in: idsToDelete },
          },
        })
      }
    })

    return prisma.tripMaterial.findMany({
      where: { trip_id: tripId },
      orderBy: { created_at: 'asc' },
    })
  }

  static async createBag(data: {
    weight: number
    material?: string
    note?: string
    ready_for_sale?: boolean
    tripId: string
    filledAt?: Date
  }): Promise<Bag> {
    const bagCode = await this.generateBagCode()
    const filledAt = data.filledAt ?? new Date()
    const weight = Math.max(0, Math.round(Number(data.weight) || 0))

    return prisma.bag.create({
      data: {
        bag_code: bagCode,
        weight,
        current_weight: weight,
        material: data.material?.trim() || null,
        note: data.note?.trim() || null,
        ready_for_sale: data.ready_for_sale ?? true,
        filled_at: filledAt,
        trip_id: data.tripId,
      },
    })
  }

  static async updateBag(
    id: string,
    data: {
      weight?: number
      current_weight?: number
      material?: string
      note?: string
      ready_for_sale?: boolean
      storage_slot_id?: string | null
      status?: BagStatus
      filled_at?: Date | null
    }
  ): Promise<Bag> {
    const normalizedCurrentWeight =
      data.current_weight !== undefined
        ? Math.max(0, Math.round(Number(data.current_weight) || 0))
        : data.weight !== undefined
          ? Math.max(0, Math.round(Number(data.weight) || 0))
          : undefined

    const updateData: Prisma.BagUpdateInput = {
      ...data,
      ...(normalizedCurrentWeight !== undefined
        ? { current_weight: normalizedCurrentWeight }
        : {}),
    }

    if (
      data.ready_for_sale === undefined &&
      (
        (normalizedCurrentWeight !== undefined && normalizedCurrentWeight <= 0) ||
        data.status === 'SOLD' ||
        data.status === 'SPLIT' ||
        data.status === 'CLOSED'
      )
    ) {
      updateData.ready_for_sale = false
    }

    return prisma.bag.update({
      where: { id },
      data: updateData,
    })
  }

  static async createBagMovement(data: {
    bagId: string
    movementType: BagMovementType
    quantity: number
    material?: string
    referenceBagId?: string
    saleReference?: string
    note?: string
    occurredAt?: Date
  }): Promise<BagMovement> {
    return prisma.bagMovement.create({
      data: {
        bag_id: data.bagId,
        movement_type: data.movementType,
        quantity: data.quantity,
        material: data.material,
        reference_bag_id: data.referenceBagId,
        sale_reference: data.saleReference,
        note: data.note,
        occurred_at: data.occurredAt ?? new Date(),
      },
    })
  }

  static async deleteBag(id: string): Promise<void> {
    await prisma.bag.delete({
      where: { id },
    })
  }

  static async splitBag(
    sourceBagId: string,
    data: {
      items: Array<{
        weight: number
        material?: string | null
        note?: string | null
        ready_for_sale?: boolean
        storage_slot_id?: string | null
      }>
      note?: string | null
    }
  ): Promise<{ source_bag: Bag; created_bags: Bag[] }> {
    const normalizedItems = data.items
      .map((item) => ({
        weight: Math.max(0, Math.round(Number(item.weight) || 0)),
        material: item.material?.trim() || null,
        note: item.note?.trim() || null,
        ready_for_sale: item.ready_for_sale,
        storage_slot_id: item.storage_slot_id ?? null,
      }))
      .filter((item) => item.weight > 0)

    if (normalizedItems.length === 0) {
      throw new Error('Validation: กรุณาระบุน้ำหนักที่ต้องการแยกอย่างน้อย 1 รายการ')
    }

    const sourceBag = await prisma.bag.findUnique({
      where: { id: sourceBagId },
    })

    if (!sourceBag) {
      throw new Error('Validation: ไม่พบเป้ต้นทาง')
    }

    if (sourceBag.status === 'SOLD' || sourceBag.status === 'CLOSED') {
      throw new Error('Validation: เป้สถานะนี้ไม่สามารถแยกได้')
    }

    const sourceCurrentWeight = Math.max(0, Math.round(Number(sourceBag.current_weight) || 0))
    if (sourceCurrentWeight <= 0) {
      throw new Error('Validation: เป้นี้ไม่มีน้ำหนักคงเหลือให้แยก')
    }

    const totalSplitWeight = normalizedItems.reduce((sum, item) => sum + item.weight, 0)
    if (totalSplitWeight > sourceCurrentWeight) {
      throw new Error('Validation: น้ำหนักรวมที่แยกเกินน้ำหนักคงเหลือของเป้ต้นทาง')
    }

    const bagCodes = await this.allocateBagCodes(normalizedItems.length)
    const baseNote = data.note?.trim() || null

    let updatedSourceBag: Bag | null = null
    const createdBags: Bag[] = []

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < normalizedItems.length; i += 1) {
        const item = normalizedItems[i]
        const createdBag = await tx.bag.create({
          data: {
            bag_code: bagCodes[i],
            weight: item.weight,
            current_weight: item.weight,
            material: item.material ?? sourceBag.material,
            note: item.note,
            ready_for_sale:
              item.ready_for_sale !== undefined
                ? item.ready_for_sale
                : sourceBag.ready_for_sale,
            filled_at: new Date(),
            status: 'OPEN',
            trip_id: sourceBag.trip_id,
            storage_slot_id: item.storage_slot_id || sourceBag.storage_slot_id,
          },
        })

        createdBags.push(createdBag)

        const movementNote = baseNote || item.note
        await tx.bagMovement.create({
          data: {
            bag_id: sourceBag.id,
            movement_type: 'SPLIT_OUT',
            quantity: item.weight,
            material: createdBag.material ?? sourceBag.material,
            reference_bag_id: createdBag.id,
            note: movementNote,
          },
        })

        await tx.bagMovement.create({
          data: {
            bag_id: createdBag.id,
            movement_type: 'SPLIT_IN',
            quantity: item.weight,
            material: createdBag.material ?? sourceBag.material,
            reference_bag_id: sourceBag.id,
            note: movementNote,
          },
        })
      }

      const remainingWeight = Math.max(sourceCurrentWeight - totalSplitWeight, 0)
      const nextStatus: BagStatus = remainingWeight > 0 ? 'PARTIAL' : 'SPLIT'

      updatedSourceBag = await tx.bag.update({
        where: { id: sourceBag.id },
        data: {
          current_weight: remainingWeight,
          status: nextStatus,
          ready_for_sale: remainingWeight > 0 ? sourceBag.ready_for_sale : false,
        },
      })
    })

    if (!updatedSourceBag) {
      throw new Error('Failed to split bag')
    }

    return {
      source_bag: updatedSourceBag,
      created_bags: createdBags,
    }
  }

  static async mergeBags(data: {
    source_bag_ids: string[]
    note?: string | null
    ready_for_sale?: boolean
    storage_slot_id?: string | null
  }): Promise<{ merged_bag: Bag; source_bags: Bag[] }> {
    const sourceBagIds = Array.from(
      new Set(
        data.source_bag_ids
          .map((id) => String(id || '').trim())
          .filter((id) => id.length > 0)
      )
    )

    if (sourceBagIds.length < 2) {
      throw new Error('Validation: ต้องเลือกอย่างน้อย 2 เป้เพื่อรวม')
    }

    const sourceBags = await prisma.bag.findMany({
      where: {
        id: { in: sourceBagIds },
      },
      orderBy: { created_at: 'asc' },
    })

    if (sourceBags.length !== sourceBagIds.length) {
      throw new Error('Validation: พบรายการเป้ไม่ครบถ้วน')
    }

    const nonMergeable = sourceBags.find(
      (bag) =>
        bag.status === 'SOLD' ||
        bag.status === 'CLOSED' ||
        Math.max(0, Math.round(Number(bag.current_weight) || 0)) <= 0
    )
    if (nonMergeable) {
      throw new Error(`Validation: เป้ ${nonMergeable.bag_code} ไม่สามารถนำมารวมได้`)
    }

    const materialSet = new Set(sourceBags.map((bag) => (bag.material ?? '').trim()))
    if (materialSet.size > 1) {
      throw new Error('Validation: รวมเป้ได้เฉพาะรายการที่เป็นชนิดเดียวกัน')
    }

    const tripSet = new Set(sourceBags.map((bag) => bag.trip_id))
    if (tripSet.size > 1) {
      throw new Error('Validation: รวมเป้ได้เฉพาะรายการที่มาจากเที่ยวเดียวกัน')
    }

    const totalWeight = sourceBags.reduce(
      (sum, bag) => sum + Math.max(0, Math.round(Number(bag.current_weight) || 0)),
      0
    )
    if (totalWeight <= 0) {
      throw new Error('Validation: น้ำหนักคงเหลือรวมต้องมากกว่า 0')
    }

    const [mergedBagCode] = await this.allocateBagCodes(1)
    const mergedMaterial = sourceBags[0]?.material ?? null
    const mergedReadyForSale =
      data.ready_for_sale !== undefined
        ? data.ready_for_sale
        : sourceBags.every((bag) => bag.ready_for_sale)
    const mergedStorageSlotId = data.storage_slot_id ?? sourceBags[0]?.storage_slot_id ?? null
    const note = data.note?.trim() || null

    let mergedBag: Bag | null = null
    let updatedSourceBags: Bag[] = []

    await prisma.$transaction(async (tx) => {
      mergedBag = await tx.bag.create({
        data: {
          bag_code: mergedBagCode,
          weight: totalWeight,
          current_weight: totalWeight,
          material: mergedMaterial,
          note,
          ready_for_sale: mergedReadyForSale,
          filled_at: new Date(),
          status: 'OPEN',
          trip_id: sourceBags[0].trip_id,
          storage_slot_id: mergedStorageSlotId,
        },
      })

      const nextSourceBags: Bag[] = []
      for (const sourceBag of sourceBags) {
        const quantity = Math.max(0, Math.round(Number(sourceBag.current_weight) || 0))
        const updatedSource = await tx.bag.update({
          where: { id: sourceBag.id },
          data: {
            current_weight: 0,
            status: 'SPLIT',
            ready_for_sale: false,
          },
        })
        nextSourceBags.push(updatedSource)

        await tx.bagMovement.create({
          data: {
            bag_id: sourceBag.id,
            movement_type: 'SPLIT_OUT',
            quantity,
            material: sourceBag.material,
            reference_bag_id: mergedBag.id,
            note,
          },
        })

        await tx.bagMovement.create({
          data: {
            bag_id: mergedBag.id,
            movement_type: 'SPLIT_IN',
            quantity,
            material: sourceBag.material,
            reference_bag_id: sourceBag.id,
            note,
          },
        })
      }

      updatedSourceBags = nextSourceBags
    })

    if (!mergedBag) {
      throw new Error('Failed to merge bags')
    }

    return {
      merged_bag: mergedBag,
      source_bags: updatedSourceBags,
    }
  }

  static async getBagMovements(filters?: {
    q?: string
    movement_type?: BagMovementType
    bag_id?: string
    take?: number
  }) {
    const q = filters?.q?.trim() || ''
    const where: Prisma.BagMovementWhereInput = {}

    if (filters?.movement_type) {
      where.movement_type = filters.movement_type
    }

    if (filters?.bag_id) {
      where.bag_id = filters.bag_id
    }

    if (q) {
      where.OR = [
        { note: { contains: q, mode: 'insensitive' } },
        { material: { contains: q, mode: 'insensitive' } },
        { sale_reference: { contains: q, mode: 'insensitive' } },
        { bag: { bag_code: { contains: q, mode: 'insensitive' } } },
        { referenceBag: { bag_code: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const take = Math.min(Math.max(Number(filters?.take) || 100, 1), 500)

    return prisma.bagMovement.findMany({
      where,
      include: {
        bag: {
          select: {
            id: true,
            bag_code: true,
          },
        },
        referenceBag: {
          select: {
            id: true,
            bag_code: true,
          },
        },
      },
      orderBy: [{ occurred_at: 'desc' }, { created_at: 'desc' }],
      take,
    })
  }

  private static async generateSaleNo(
    tx: Prisma.TransactionClient,
    soldAt: Date
  ): Promise<string> {
    const year = soldAt.getFullYear()
    const month = String(soldAt.getMonth() + 1).padStart(2, '0')
    const day = String(soldAt.getDate()).padStart(2, '0')
    const prefix = `SO${year}${month}${day}-`

    const rows = await tx.saleOrder.findMany({
      where: {
        sale_no: { startsWith: prefix },
      },
      select: { sale_no: true },
    })

    let maxSeq = 0
    for (const row of rows) {
      const suffix = row.sale_no.slice(prefix.length)
      const parsed = Number.parseInt(suffix, 10)
      if (Number.isNaN(parsed)) continue
      if (parsed > maxSeq) maxSeq = parsed
    }

    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
  }

  static async getSellableBags(filters?: { q?: string; take?: number }) {
    const q = filters?.q?.trim() || ''
    const where: Prisma.BagWhereInput = {
      ready_for_sale: true,
      current_weight: { gt: 0 },
      status: { in: ['OPEN', 'PARTIAL'] },
    }

    if (q) {
      where.OR = [
        { bag_code: { contains: q, mode: 'insensitive' } },
        { material: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
      ]
    }

    const take = Math.min(Math.max(Number(filters?.take) || 200, 1), 1000)
    return prisma.bag.findMany({
      where,
      include: {
        trip: {
          select: {
            id: true,
            vehicle_id: true,
          },
        },
        storage_slot: {
          include: {
            zone: {
              select: {
                id: true,
                zone_code: true,
                zone_name: true,
              },
            },
          },
        },
      },
      orderBy: [{ created_at: 'desc' }],
      take,
    })
  }

  static async getSaleOrders(filters?: { q?: string; take?: number }) {
    const q = filters?.q?.trim() || ''
    const take = Math.min(Math.max(Number(filters?.take) || 50, 1), 200)

    const where: Prisma.SaleOrderWhereInput = {}
    if (q) {
      where.OR = [
        { sale_no: { contains: q, mode: 'insensitive' } },
        { customer_name: { contains: q, mode: 'insensitive' } },
        {
          allocations: {
            some: {
              bag: {
                bag_code: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ]
    }

    return prisma.saleOrder.findMany({
      where,
      include: {
        allocations: {
          include: {
            bag: {
              select: {
                id: true,
                bag_code: true,
                material: true,
              },
            },
          },
          orderBy: [{ created_at: 'asc' }],
        },
      },
      orderBy: [{ sold_at: 'desc' }, { created_at: 'desc' }],
      take,
    })
  }

  static async getSaleOrderById(id: string) {
    return prisma.saleOrder.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            bag: {
              select: {
                id: true,
                bag_code: true,
                material: true,
                current_weight: true,
                status: true,
              },
            },
          },
          orderBy: [{ created_at: 'asc' }],
        },
      },
    })
  }

  static async createConfirmedSaleOrder(data: {
    customer_name: string
    items: Array<{
      bag_id: string
      quantity: number
      unit_price?: number
    }>
    sold_at?: Date
    note?: string | null
  }) {
    const customerName = data.customer_name.trim()
    if (!customerName) {
      throw new Error('Validation: กรุณากรอกชื่อลูกค้า')
    }

    const mergedItems = new Map<
      string,
      { bag_id: string; quantity: number; unit_price: number }
    >()

    for (const rawItem of data.items) {
      const bagId = String(rawItem.bag_id || '').trim()
      const quantity = Math.max(0, Math.round(Number(rawItem.quantity) || 0))
      const unitPrice = Math.max(0, Number(rawItem.unit_price) || 0)

      if (!bagId || quantity <= 0) continue

      const current = mergedItems.get(bagId)
      if (current) {
        current.quantity += quantity
        current.unit_price = unitPrice
      } else {
        mergedItems.set(bagId, {
          bag_id: bagId,
          quantity,
          unit_price: unitPrice,
        })
      }
    }

    const items = [...mergedItems.values()]
    if (items.length === 0) {
      throw new Error('Validation: กรุณาเลือกเป้และปริมาณที่ต้องการขาย')
    }

    const soldAt = data.sold_at ?? new Date()
    const note = data.note?.trim() || null

    return prisma.$transaction(async (tx) => {
      const bags = await tx.bag.findMany({
        where: {
          id: { in: items.map((item) => item.bag_id) },
        },
      })

      if (bags.length !== items.length) {
        throw new Error('Validation: พบข้อมูลเป้ไม่ครบถ้วน')
      }

      const bagMap = new Map(bags.map((bag) => [bag.id, bag]))
      for (const item of items) {
        const bag = bagMap.get(item.bag_id)
        if (!bag) {
          throw new Error('Validation: พบข้อมูลเป้ไม่ครบถ้วน')
        }

        if (!bag.ready_for_sale) {
          throw new Error(`Validation: เป้ ${bag.bag_code} ยังไม่พร้อมขาย`)
        }

        if (bag.status !== 'OPEN' && bag.status !== 'PARTIAL') {
          throw new Error(`Validation: เป้ ${bag.bag_code} อยู่สถานะที่ขายไม่ได้`)
        }

        const currentWeight = Math.max(0, Number(bag.current_weight) || 0)
        if (item.quantity > currentWeight) {
          throw new Error(
            `Validation: ปริมาณขายของเป้ ${bag.bag_code} เกินน้ำหนักคงเหลือ`
          )
        }
      }

      const saleNo = await this.generateSaleNo(tx, soldAt)
      const saleOrder = await tx.saleOrder.create({
        data: {
          sale_no: saleNo,
          customer_name: customerName,
          sold_at: soldAt,
          status: 'CONFIRMED',
        },
      })

      for (const item of items) {
        const bag = bagMap.get(item.bag_id)
        if (!bag) continue

        const quantity = Math.max(0, Number(item.quantity) || 0)
        const unitPrice = Math.max(0, Number(item.unit_price) || 0)
        const totalPrice = quantity * unitPrice

        await tx.saleAllocation.create({
          data: {
            sale_id: saleOrder.id,
            bag_id: bag.id,
            material: bag.material,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
          },
        })

        const remainingWeight = Math.max((Number(bag.current_weight) || 0) - quantity, 0)
        const nextStatus: BagStatus = remainingWeight > 0 ? 'PARTIAL' : 'SOLD'

        await tx.bag.update({
          where: { id: bag.id },
          data: {
            current_weight: remainingWeight,
            status: nextStatus,
            ready_for_sale: remainingWeight > 0 ? bag.ready_for_sale : false,
          },
        })

        await tx.bagMovement.create({
          data: {
            bag_id: bag.id,
            movement_type: 'SALE_OUT',
            quantity,
            material: bag.material,
            sale_reference: saleOrder.sale_no,
            note,
          },
        })
      }

      const payload = await tx.saleOrder.findUnique({
        where: { id: saleOrder.id },
        include: {
          allocations: {
            include: {
              bag: {
                select: {
                  id: true,
                  bag_code: true,
                  material: true,
                },
              },
            },
            orderBy: [{ created_at: 'asc' }],
          },
        },
      })

      if (!payload) {
        throw new Error('Failed to load created sale order')
      }

      return payload
    })
  }

  static async cancelSaleOrder(
    id: string,
    data?: { note?: string | null }
  ) {
    const note = data?.note?.trim() || null

    return prisma.$transaction(async (tx) => {
      const saleOrder = await tx.saleOrder.findUnique({
        where: { id },
        include: {
          allocations: {
            include: {
              bag: true,
            },
            orderBy: [{ created_at: 'asc' }],
          },
        },
      })

      if (!saleOrder) {
        throw new Error('Validation: ไม่พบใบขายที่ต้องการยกเลิก')
      }

      if (saleOrder.status === 'CANCELLED') {
        throw new Error('Validation: ใบขายนี้ถูกยกเลิกแล้ว')
      }

      if (saleOrder.status !== 'CONFIRMED') {
        throw new Error('Validation: ยกเลิกได้เฉพาะใบขายที่ยืนยันแล้ว')
      }

      const movementNote = note
        ? `ยกเลิกใบขาย: ${note}`
        : 'ยกเลิกใบขายและคืนสต๊อก'

      for (const allocation of saleOrder.allocations) {
        const bag = allocation.bag
        const quantity = Math.max(0, Number(allocation.quantity) || 0)
        if (!bag || quantity <= 0) continue

        const nextWeight = Math.max((Number(bag.current_weight) || 0) + quantity, 0)
        const bagWeight = Math.max(Number(bag.weight) || 0, 0)
        const nextStatus: BagStatus =
          nextWeight <= 0 ? 'SOLD' : nextWeight < bagWeight ? 'PARTIAL' : 'OPEN'

        await tx.bag.update({
          where: { id: bag.id },
          data: {
            current_weight: nextWeight,
            status: nextStatus,
          },
        })

        await tx.bagMovement.create({
          data: {
            bag_id: bag.id,
            movement_type: 'ADJUST_IN',
            quantity,
            material: allocation.material ?? bag.material,
            sale_reference: saleOrder.sale_no,
            note: movementNote,
          },
        })
      }

      await tx.saleOrder.update({
        where: { id: saleOrder.id },
        data: { status: 'CANCELLED' },
      })

      const payload = await tx.saleOrder.findUnique({
        where: { id: saleOrder.id },
        include: {
          allocations: {
            include: {
              bag: {
                select: {
                  id: true,
                  bag_code: true,
                  material: true,
                  current_weight: true,
                  status: true,
                },
              },
            },
            orderBy: [{ created_at: 'asc' }],
          },
        },
      })

      if (!payload) {
        throw new Error('Failed to load cancelled sale order')
      }

      return payload
    })
  }

  static async generateBagCode(): Promise<string> {
    const [code] = await this.allocateBagCodes(1)
    return code
  }

  static async getStatistics() {
    const [totalTrips, completedTrips, weightData, totalBags] = await Promise.all([
      prisma.trip.count(),
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
      prisma.trip.findMany({
        where: { status: 'COMPLETED' },
        select: { our_net_weight: true, weight_difference: true },
      }),
      prisma.bag.count(),
    ])

    const totalWeight = weightData.reduce(
      (sum, trip) => sum + (trip.our_net_weight || trip.weight_difference || 0),
      0
    )

    return {
      totalTrips,
      completedTrips,
      totalWeight,
      totalBags,
    }
  }

  static async getOperationsSummary() {
    const start = TODAY_START()
    const end = TODAY_END()

    const [activeTrips, todayTrips, bagInventoryRaw, recentTrips] = await Promise.all([
      prisma.trip.count({
        where: {
          status: {
            notIn: ['COMPLETED', 'RECONCILED'],
          },
        },
      }),
      prisma.trip.findMany({
        where: {
          created_at: {
            gte: start,
            lt: end,
          },
        },
        select: {
          id: true,
          vehicle_id: true,
          trip_type: true,
          partner_id: true,
          driver_name: true,
          customer_factory: true,
          status: true,
          customer_reported_weight: true,
          our_net_weight: true,
          weight_variance: true,
          departed_plant_at: true,
          arrived_customer_at: true,
          departed_customer_at: true,
          arrived_plant_at: true,
          loaded_weight_in: true,
          empty_weight_after_unload: true,
          created_at: true,
          materials: {
            select: {
              id: true,
              material_type: true,
              customer_weight: true,
              received_weight: true,
              bagged_weight: true,
            },
          },
          partner: {
            select: {
              id: true,
              name: true,
              partner_type: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.bag.groupBy({
        by: ['material'],
        where: {
          current_weight: { gt: 0 },
          status: { notIn: ['SOLD', 'CLOSED'] },
        },
        _count: { _all: true },
        _sum: { current_weight: true },
      }),
      prisma.trip.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: {
          materials: true,
          bags: true,
        },
      }),
    ])

    const totalCustomerWeight = todayTrips.reduce(
      (sum, trip) => sum + (trip.customer_reported_weight || 0),
      0
    )

    const totalOurNetWeight = todayTrips.reduce(
      (sum, trip) => sum + (trip.our_net_weight || 0),
      0
    )

    const totalVariance = todayTrips.reduce(
      (sum, trip) => sum + (trip.weight_variance || 0),
      0
    )

    const varianceAlerts = todayTrips.filter((trip) => {
      const customerWeight = trip.customer_reported_weight || 0
      if (customerWeight <= 0) return false
      const pct = Math.abs(((trip.weight_variance || 0) / customerWeight) * 100)
      return pct > 1.5
    }).length

    const bagInventory = bagInventoryRaw.map((row) => ({
      material: row.material || 'ไม่ระบุชนิด',
      bagCount: row._count._all,
      totalWeight: row._sum.current_weight || 0,
    }))

    return {
      activeTrips,
      todayTripCount: todayTrips.length,
      totalCustomerWeight,
      totalOurNetWeight,
      totalVariance,
      varianceAlerts,
      bagInventory,
      todayTrips,
      recentTrips,
    }
  }
}
