export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          vehicle_id: string
          customer_factory: string
          departure_time: string
          arrival_time: string | null
          return_time: string | null
          initial_weight: number
          final_weight: number
          weight_difference: number
          status: TripStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          customer_factory: string
          departure_time?: string
          arrival_time?: string | null
          return_time?: string | null
          initial_weight?: number
          final_weight?: number
          weight_difference?: number
          status?: TripStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          customer_factory?: string
          departure_time?: string
          arrival_time?: string | null
          return_time?: string | null
          initial_weight?: number
          final_weight?: number
          weight_difference?: number
          status?: TripStatus
          updated_at?: string
        }
      }
      bags: {
        Row: {
          id: string
          bag_code: string
          weight: number
          material: string | null
          trip_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bag_code: string
          weight?: number
          material?: string | null
          trip_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bag_code?: string
          weight?: number
          material?: string | null
          trip_id?: string
          updated_at?: string
        }
      }
    }
  }
}

export type TripStatus = 
  | 'PENDING'           // รออกรถ
  | 'TRAVELING'         // เดินทางไปโรงงาน
  | 'ARRIVED'           // ถึงโรงงานแล้ว
  | 'WEIGHING_INITIAL'  // ชั่งน้ำหนักเริ่มต้น
  | 'WEIGHING_FINAL'    // ชั่งน้ำหนักสุดท้าย
  | 'PACKING'           // บรรจุใส่เป้
  | 'COMPLETED'         // เสร็จสิ้น

export type Trip = Database['public']['Tables']['trips']['Row']
export type Bag = Database['public']['Tables']['bags']['Row']
export type InsertTrip = Database['public']['Tables']['trips']['Insert']
export type UpdateTrip = Database['public']['Tables']['trips']['Update']
export type InsertBag = Database['public']['Tables']['bags']['Insert']
export type UpdateBag = Database['public']['Tables']['bags']['Update']