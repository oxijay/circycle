import { Scale, Truck } from 'lucide-react';

import type { TripMaterial, TripStatus, TripStep, TripType } from './types';

export const STATUS_LABELS: Record<TripStatus, string> = {
  PENDING: 'รออกรถ',
  TRAVELING: 'เดินทางไปโรงงาน',
  ARRIVED: 'ถึงโรงงานแล้ว',
  WEIGHING_INITIAL: 'ชั่งน้ำหนักเริ่มต้น',
  WEIGHING_FINAL: 'ชั่งน้ำหนักสุดท้าย',
  PACKING: 'บรรจุใส่เป้',
  WEIGHED_EMPTY_OUT: 'ชั่งรถเปล่าก่อนออก',
  DEPARTED_PLANT: 'ออกจากโรงงานเรา',
  ARRIVED_CUSTOMER: 'ถึงโรงงานลูกค้า',
  LOADED_AT_CUSTOMER: 'ขึ้นของเสร็จ',
  DEPARTED_CUSTOMER: 'ออกจากโรงงานลูกค้า',
  ARRIVED_PLANT: 'กลับถึงโรงงานเรา',
  WEIGHED_LOADED_IN: 'ชั่งรถรวมของ',
  UNLOADING: 'กำลังลงของ',
  WEIGHED_EMPTY_AFTER_UNLOAD: 'ชั่งหลังลงของ',
  RECONCILED: 'รอจัดการลงเป้',
  COMPLETED: 'เสร็จสิ้น',
};

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  INBOUND_PURCHASE: 'รับเข้า',
  OUTBOUND_SALE: 'ส่งขาย',
};

export const MATERIAL_OPTIONS = [
  'อลูมิเนียม',
  'เหล็ก',
  'ทองแดง',
  'สแตนเลส',
  'พลาสติก',
  'กระดาษ',
  'ยาง',
  'อื่นๆ',
];

export const MAX_MATERIAL_ROWS = 10;

export const TRIP_STEPS: TripStep[] = [
  { id: 1, title: 'รถออกจากบริษัท', icon: Truck },
  { id: 2, title: 'น้ำหนักลูกค้า', icon: Scale },
  { id: 3, title: 'น้ำหนักขาเข้า', icon: Scale },
];

export const createEmptyMaterial = (): TripMaterial => ({
  material_type: '',
  customer_weight: 0,
  received_weight: 0,
  bagged_weight: 0,
});
