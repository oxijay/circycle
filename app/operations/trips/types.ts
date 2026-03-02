import type { LucideIcon } from 'lucide-react';

export interface Bag {
  id: string;
  bag_code: string;
  weight: number;
  current_weight?: number;
  material: string | null;
  note?: string | null;
  ready_for_sale?: boolean;
  status?: string;
  filled_at?: string | null;
  trip_id: string;
  created_at: string;
  updated_at: string;
}

export interface TripMaterial {
  id?: string;
  material_type: string;
  customer_weight: number;
  received_weight?: number;
  bagged_weight?: number;
}

export type TripType = 'INBOUND_PURCHASE' | 'OUTBOUND_SALE';
export type PartnerType = 'SUPPLIER' | 'BUYER' | 'BOTH';

export interface Partner {
  id: string;
  name: string;
  factory_name?: string | null;
  partner_type: PartnerType;
  is_active: boolean;
}

export type TripStatus =
  | 'PENDING'
  | 'TRAVELING'
  | 'ARRIVED'
  | 'WEIGHING_INITIAL'
  | 'WEIGHING_FINAL'
  | 'PACKING'
  | 'WEIGHED_EMPTY_OUT'
  | 'DEPARTED_PLANT'
  | 'ARRIVED_CUSTOMER'
  | 'LOADED_AT_CUSTOMER'
  | 'DEPARTED_CUSTOMER'
  | 'ARRIVED_PLANT'
  | 'WEIGHED_LOADED_IN'
  | 'UNLOADING'
  | 'WEIGHED_EMPTY_AFTER_UNLOAD'
  | 'RECONCILED'
  | 'COMPLETED';

export interface Trip {
  id: string;
  vehicle_id: string;
  automil_vehicle_id?: string | null;
  driver_name?: string | null;
  trip_type: TripType;
  partner_id?: string | null;
  customer_factory: string;
  departure_time: string;
  arrival_time: string | null;
  return_time: string | null;
  initial_weight: number;
  final_weight: number;
  loaded_weight_in?: number;
  empty_weight_after_unload?: number;
  our_net_weight?: number;
  customer_reported_weight?: number;
  weight_variance?: number;
  weight_difference: number;
  status: TripStatus;
  inbound_removed_at?: string | null;
  inbound_removed_reason?: string | null;
  created_at: string;
  updated_at: string;
  bags?: Bag[];
  materials?: TripMaterial[];
  partner?: Partner | null;
}

export interface VehicleOption {
  id: string;
  plateNo: string;
  driverName?: string;
  status?: string;
}

export interface VehiclePayload {
  vehicles: VehicleOption[];
  error?: string;
}

export type PartnerPayload = Partner[];

export interface TripStep {
  id: number;
  title: string;
  icon: LucideIcon;
}

export interface MaterialSummary {
  validRows: TripMaterial[];
  hasPartialRows: boolean;
  totalWeight: number;
}

export interface StepThreeSummary {
  emptyTruckWeight: number;
  cargoWeight: number;
  grossWeight: number;
  materialCount: number;
}

export interface StepFourSummary {
  grossInbound: number;
  emptyAfterUnload: number;
  cargoActual: number;
  cargoFromCustomer: number;
  variance: number;
  hasScaleResult: boolean;
}

export interface BagSummary {
  totalWeight: number;
  expectedWeight: number;
  remainingWeight: number;
  difference: number;
  isMatched: boolean;
  isOverPacked: boolean;
  progressPct: number;
  bagCount: number;
}
