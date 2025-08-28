import { supabase } from './supabase'
import type { Trip, Bag, InsertTrip, UpdateTrip, InsertBag, UpdateBag, TripStatus } from '@/types/database'

export class TripService {
  // สร้างเที่ยวใหม่
  static async createTrip(data: { vehicleId: string; customerFactory: string }): Promise<Trip> {
    const tripData: InsertTrip = {
      vehicle_id: data.vehicleId,
      customer_factory: data.customerFactory,
      status: 'PENDING',
      departure_time: new Date().toISOString(),
      initial_weight: 0,
      final_weight: 0,
      weight_difference: 0
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .insert(tripData)
      .select('*')
      .single()

    if (error) throw error
    return trip
  }

  // อัพเดทข้อมูลเที่ยว
  static async updateTrip(id: string, data: Partial<UpdateTrip>): Promise<Trip> {
    // คำนวณส่วนต่างน้ำหนักถ้ามีการส่งน้ำหนักทั้งคู่
    const updateData = { ...data, updated_at: new Date().toISOString() }
    
    if (data.initial_weight !== undefined && data.final_weight !== undefined) {
      updateData.weight_difference = data.final_weight - data.initial_weight
    } else if (data.final_weight !== undefined || data.initial_weight !== undefined) {
      // ดึงข้อมูลปัจจุบันมาคำนวณ
      const { data: currentTrip } = await supabase
        .from('trips')
        .select('initial_weight, final_weight')
        .eq('id', id)
        .single()
      
      if (currentTrip) {
        const initialWeight = data.initial_weight ?? currentTrip.initial_weight
        const finalWeight = data.final_weight ?? currentTrip.final_weight
        updateData.weight_difference = finalWeight - initialWeight
      }
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return trip
  }

  // ดึงข้อมูลเที่ยวทั้งหมดพร้อมเป้
  static async getAllTripsWithBags(): Promise<(Trip & { bags: Bag[] })[]> {
    const { data: trips, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        bags (*)
      `)
      .order('created_at', { ascending: false })

    if (tripError) throw tripError
    return trips as (Trip & { bags: Bag[] })[]
  }

  // ดึงข้อมูลเที่ยวเดียวพร้อมเป้
  static async getTripWithBags(id: string): Promise<(Trip & { bags: Bag[] }) | null> {
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        *,
        bags (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return trip as Trip & { bags: Bag[] }
  }

  // เพิ่มเป้
  static async createBag(data: { weight: number; material?: string; tripId: string }): Promise<Bag> {
    // สร้างรหัสเป้อัตโนมัติ
    const bagCode = await this.generateBagCode()
    
    const bagData: InsertBag = {
      bag_code: bagCode,
      weight: data.weight,
      material: data.material,
      trip_id: data.tripId
    }

    const { data: bag, error } = await supabase
      .from('bags')
      .insert(bagData)
      .select('*')
      .single()

    if (error) throw error
    return bag
  }

  // อัพเดทข้อมูลเป้
  static async updateBag(id: string, data: { weight?: number; material?: string }): Promise<Bag> {
    const updateData: UpdateBag = {
      ...data,
      updated_at: new Date().toISOString()
    }

    const { data: bag, error } = await supabase
      .from('bags')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return bag
  }

  // ลบเป้
  static async deleteBag(id: string): Promise<void> {
    const { error } = await supabase
      .from('bags')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // สร้างรหัสเป้อัตโนมัติ
  static async generateBagCode(): Promise<string> {
    const { count, error } = await supabase
      .from('bags')
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    return `BAG${String((count || 0) + 1).padStart(6, '0')}`
  }

  // รายงานสถิติ
  static async getStatistics() {
    const [
      { count: totalTrips },
      { count: completedTrips },
      { data: weightData },
      { count: totalBags }
    ] = await Promise.all([
      supabase.from('trips').select('*', { count: 'exact', head: true }),
      supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      supabase.from('trips').select('weight_difference').eq('status', 'COMPLETED'),
      supabase.from('bags').select('*', { count: 'exact', head: true })
    ])

    const totalWeight = weightData?.reduce((sum, trip) => sum + (trip.weight_difference || 0), 0) || 0

    return {
      totalTrips: totalTrips || 0,
      completedTrips: completedTrips || 0,
      totalWeight,
      totalBags: totalBags || 0
    }
  }
}