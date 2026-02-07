import { prisma } from './prisma'
import { Trip, Bag, TripStatus } from '@prisma/client'

export type TripWithBags = Trip & { bags: Bag[] }

export class TripService {
  // สร้างเที่ยวใหม่
  static async createTrip(data: { vehicleId: string; customerFactory: string }): Promise<Trip> {
    return prisma.trip.create({
      data: {
        vehicle_id: data.vehicleId,
        customer_factory: data.customerFactory,
        status: 'PENDING',
        initial_weight: 0,
        final_weight: 0,
        weight_difference: 0
      }
    })
  }

  // อัพเดทข้อมูลเที่ยว
  static async updateTrip(id: string, data: Partial<{
    vehicle_id: string
    customer_factory: string
    departure_time: Date
    arrival_time: Date | null
    return_time: Date | null
    initial_weight: number
    final_weight: number
    status: TripStatus
  }>): Promise<Trip> {
    // คำนวณส่วนต่างน้ำหนักถ้ามีการส่งน้ำหนักทั้งคู่
    let weight_difference: number | undefined

    if (data.initial_weight !== undefined && data.final_weight !== undefined) {
      weight_difference = data.final_weight - data.initial_weight
    } else if (data.final_weight !== undefined || data.initial_weight !== undefined) {
      // ดึงข้อมูลปัจจุบันมาคำนวณ
      const currentTrip = await prisma.trip.findUnique({
        where: { id },
        select: { initial_weight: true, final_weight: true }
      })

      if (currentTrip) {
        const initialWeight = data.initial_weight ?? currentTrip.initial_weight
        const finalWeight = data.final_weight ?? currentTrip.final_weight
        weight_difference = finalWeight - initialWeight
      }
    }

    return prisma.trip.update({
      where: { id },
      data: {
        ...data,
        ...(weight_difference !== undefined && { weight_difference })
      }
    })
  }

  // ดึงข้อมูลเที่ยวทั้งหมดพร้อมเป้
  static async getAllTripsWithBags(): Promise<TripWithBags[]> {
    return prisma.trip.findMany({
      include: { bags: true },
      orderBy: { created_at: 'desc' }
    })
  }

  // ดึงข้อมูลเที่ยวเดียวพร้อมเป้
  static async getTripWithBags(id: string): Promise<TripWithBags | null> {
    return prisma.trip.findUnique({
      where: { id },
      include: { bags: true }
    })
  }

  // เพิ่มเป้
  static async createBag(data: { weight: number; material?: string; tripId: string }): Promise<Bag> {
    // สร้างรหัสเป้อัตโนมัติ
    const bagCode = await this.generateBagCode()

    return prisma.bag.create({
      data: {
        bag_code: bagCode,
        weight: data.weight,
        material: data.material,
        trip_id: data.tripId
      }
    })
  }

  // อัพเดทข้อมูลเป้
  static async updateBag(id: string, data: { weight?: number; material?: string }): Promise<Bag> {
    return prisma.bag.update({
      where: { id },
      data
    })
  }

  // ลบเป้
  static async deleteBag(id: string): Promise<void> {
    await prisma.bag.delete({
      where: { id }
    })
  }

  // สร้างรหัสเป้อัตโนมัติ
  static async generateBagCode(): Promise<string> {
    const count = await prisma.bag.count()
    return `BAG${String(count + 1).padStart(6, '0')}`
  }

  // รายงานสถิติ
  static async getStatistics() {
    const [totalTrips, completedTrips, weightData, totalBags] = await Promise.all([
      prisma.trip.count(),
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
      prisma.trip.findMany({
        where: { status: 'COMPLETED' },
        select: { weight_difference: true }
      }),
      prisma.bag.count()
    ])

    const totalWeight = weightData.reduce((sum: number, trip: { weight_difference: number }) => sum + (trip.weight_difference || 0), 0)

    return {
      totalTrips,
      completedTrips,
      totalWeight,
      totalBags
    }
  }
}
