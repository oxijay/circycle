// app/components/bags/types.ts

export interface Material {
  type: string;
  percentage: number;
  estimatedWeight: number;
}

export interface BagHistory {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details: string;
}

export interface Bag {
  id: string;
  tagNumber: string;
  originalWeight: number;
  currentWeight: number;
  status: 'preparing' | 'sorting' | 'ready' | 'sold';
  tripId: string;
  tripDate: string;
  clientName: string;
  materials: Material[];
  createdAt: string;
  updatedAt: string;
  parentBagId?: string;
  childBagIds?: string[];
  notes: string;
  history: BagHistory[];
}

export const statusLabels = {
  preparing: { label: 'เตรียมคัดแยก', color: 'bg-yellow-500', icon: 'Clock' },
  sorting: { label: 'ระหว่างคัดแยก', color: 'bg-blue-500', icon: 'Split' },
  ready: { label: 'พร้อมจำหน่าย', color: 'bg-green-500', icon: 'CheckCircle' },
  sold: { label: 'จำหน่ายแล้ว', color: 'bg-gray-500', icon: 'CheckCircle' }
};

// Mock data
export const mockBags: Bag[] = [
  {
    id: '1',
    tagNumber: 'BAG001',
    originalWeight: 500,
    currentWeight: 500,
    status: 'preparing',
    tripId: 'TRIP001',
    tripDate: '2025-01-15',
    clientName: 'โรงงาน ABC จำกัด',
    materials: [
      { type: 'ทองแดง', percentage: 80, estimatedWeight: 400 },
      { type: 'เหล็ก', percentage: 20, estimatedWeight: 100 }
    ],
    createdAt: '2025-01-15T10:30:00',
    updatedAt: '2025-01-15T10:30:00',
    notes: 'วัสดุคุณภาพดี',
    history: [
      {
        id: 'h1',
        action: 'สร้างเป้',
        timestamp: '2025-01-15T10:30:00',
        user: 'สมชาย ใจดี',
        details: 'สร้างเป้จากเที่ยว TRIP001'
      }
    ]
  },
  {
    id: '2',
    tagNumber: 'BAG002',
    originalWeight: 300,
    currentWeight: 180,
    status: 'sorting',
    tripId: 'TRIP001',
    tripDate: '2025-01-14',
    clientName: 'บริษัท XYZ อุตสาหกรรม',
    materials: [
      { type: 'อลูมิเนียม', percentage: 60, estimatedWeight: 108 },
      { type: 'พลาสติก', percentage: 40, estimatedWeight: 72 }
    ],
    createdAt: '2025-01-14T14:20:00',
    updatedAt: '2025-01-15T09:15:00',
    parentBagId: undefined,
    childBagIds: ['3', '4'],
    notes: 'กำลังคัดแยก',
    history: [
      {
        id: 'h2',
        action: 'เริ่มคัดแยก',
        timestamp: '2025-01-15T09:15:00',
        user: 'สมหญิง รักงาน',
        details: 'เริ่มขั้นตอนการคัดแยกวัสดุ'
      }
    ]
  },
  {
    id: '3',
    tagNumber: 'BAG002-A',
    originalWeight: 0,
    currentWeight: 108,
    status: 'ready',
    tripId: 'TRIP001',
    tripDate: '2025-01-14',
    clientName: 'บริษัท XYZ อุตสาหกรรม',
    materials: [
      { type: 'อลูมิเนียม', percentage: 100, estimatedWeight: 108 }
    ],
    createdAt: '2025-01-15T11:00:00',
    updatedAt: '2025-01-15T11:00:00',
    parentBagId: '2',
    notes: 'อลูมิเนียมคัดแยกแล้ว',
    history: [
      {
        id: 'h3',
        action: 'คัดแยกจากเป้ BAG002',
        timestamp: '2025-01-15T11:00:00',
        user: 'สมหญิง รักงาน',
        details: 'คัดแยกอลูมิเนียมออกจากเป้หลัก'
      }
    ]
  },
  {
    id: '4',
    tagNumber: 'BAG002-B',
    originalWeight: 0,
    currentWeight: 72,
    status: 'ready',
    tripId: 'TRIP001',
    tripDate: '2025-01-14',
    clientName: 'บริษัท XYZ อุตสาหกรรม',
    materials: [
      { type: 'พลาสติก', percentage: 100, estimatedWeight: 72 }
    ],
    createdAt: '2025-01-15T11:00:00',
    updatedAt: '2025-01-15T11:00:00',
    parentBagId: '2',
    notes: 'พลาสติกคัดแยกแล้ว',
    history: [
      {
        id: 'h4',
        action: 'คัดแยกจากเป้ BAG002',
        timestamp: '2025-01-15T11:00:00',
        user: 'สมหญิง รักงาน',
        details: 'คัดแยกพลาสติกออกจากเป้หลัก'
      }
    ]
  }
];