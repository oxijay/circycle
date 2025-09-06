// app/components/materialLots/types.ts

export interface MaterialLot {
  id: string;
  lotNumber: string;
  tripId: string;
  tripDate: string;
  clientName: string;
  clientLocation: string;
  vehicleInfo: {
    plate: string;
    driver: string;
  };
  originalWeight: number;
  currentWeight: number;
  weightAtClient: number;
  weightAtCompany: number;
  weightDifference: number;
  materials: MaterialType[];
  bags: LotBag[];
  status: 'pending' | 'processing' | 'completed' | 'shipped';
  createdAt: string;
  updatedAt: string;
  notes: string;
  photos: {
    clientPhotos: string[];
    companyPhotos: string[];
  };
}

export interface MaterialType {
  type: string;
  estimatedPercentage: number;
  estimatedWeight: number;
  actualWeight?: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string;
}

export interface LotBag {
  id: string;
  tagNumber: string;
  weight: number;
  materials: BagMaterial[];
  status: 'original' | 'sorted' | 'sub-bag';
  parentBagId?: string;
  childBagIds?: string[];
  createdAt: string;
  notes: string;
}

export interface BagMaterial {
  type: string;
  percentage: number;
  weight: number;
}

export const lotStatusLabels = {
  pending: { label: 'รอดำเนินการ', color: 'bg-yellow-500', icon: 'Clock' },
  processing: { label: 'กำลังดำเนินการ', color: 'bg-blue-500', icon: 'Settings' },
  completed: { label: 'เสร็จสิ้น', color: 'bg-green-500', icon: 'CheckCircle' },
  shipped: { label: 'จัดส่งแล้ว', color: 'bg-gray-500', icon: 'Truck' }
};

export const materialQualityLabels = {
  excellent: { label: 'ดีเยี่ยม', color: 'text-green-400' },
  good: { label: 'ดี', color: 'text-blue-400' },
  fair: { label: 'พอใช้', color: 'text-yellow-400' },
  poor: { label: 'ต่ำ', color: 'text-red-400' }
};

// Mock data
export const mockMaterialLots: MaterialLot[] = [
  {
    id: '1',
    lotNumber: 'LOT001-2025',
    tripId: 'TRIP001',
    tripDate: '2025-01-15',
    clientName: 'โรงงาน ABC จำกัด',
    clientLocation: 'นิคมอุตสาหกรรมลาดกระบัง',
    vehicleInfo: {
      plate: 'กข-1234',
      driver: 'สมชาย ใจดี'
    },
    originalWeight: 1500,
    currentWeight: 1450,
    weightAtClient: 1500,
    weightAtCompany: 1450,
    weightDifference: -50,
    materials: [
      {
        type: 'ทองแดง',
        estimatedPercentage: 60,
        estimatedWeight: 900,
        actualWeight: 870,
        quality: 'excellent',
        notes: 'คุณภาพดีมาก สะอาด'
      },
      {
        type: 'เหล็ก',
        estimatedPercentage: 30,
        estimatedWeight: 450,
        actualWeight: 435,
        quality: 'good',
        notes: 'มีสนิมเล็กน้อย'
      },
      {
        type: 'อลูมิเนียม',
        estimatedPercentage: 10,
        estimatedWeight: 150,
        actualWeight: 145,
        quality: 'good',
        notes: 'สภาพดี'
      }
    ],
    bags: [
      {
        id: 'bag1',
        tagNumber: 'BAG001',
        weight: 500,
        materials: [
          { type: 'ทองแดง', percentage: 80, weight: 400 },
          { type: 'เหล็ก', percentage: 20, weight: 100 }
        ],
        status: 'sorted',
        childBagIds: ['bag2', 'bag3'],
        createdAt: '2025-01-15T10:30:00',
        notes: 'แบ่งแล้ว'
      },
      {
        id: 'bag2',
        tagNumber: 'BAG001-A',
        weight: 400,
        materials: [
          { type: 'ทองแดง', percentage: 100, weight: 400 }
        ],
        status: 'sub-bag',
        parentBagId: 'bag1',
        createdAt: '2025-01-15T11:00:00',
        notes: 'ทองแดงบริสุทธิ์'
      },
      {
        id: 'bag3',
        tagNumber: 'BAG001-B',
        weight: 100,
        materials: [
          { type: 'เหล็ก', percentage: 100, weight: 100 }
        ],
        status: 'sub-bag',
        parentBagId: 'bag1',
        createdAt: '2025-01-15T11:00:00',
        notes: 'เหล็กคัดแยกแล้ว'
      },
      {
        id: 'bag4',
        tagNumber: 'BAG002',
        weight: 950,
        materials: [
          { type: 'ทองแดง', percentage: 50, weight: 475 },
          { type: 'เหล็ก', percentage: 35, weight: 332.5 },
          { type: 'อลูมิเนียม', percentage: 15, weight: 142.5 }
        ],
        status: 'original',
        createdAt: '2025-01-15T10:30:00',
        notes: 'ยังไม่ได้คัดแยก'
      }
    ],
    status: 'processing',
    createdAt: '2025-01-15T09:00:00',
    updatedAt: '2025-01-15T11:30:00',
    notes: 'วัสดุคุณภาพดี ลูกค้าประจำ',
    photos: {
      clientPhotos: ['client1.jpg', 'client2.jpg'],
      companyPhotos: ['company1.jpg', 'company2.jpg']
    }
  },
  {
    id: '2',
    lotNumber: 'LOT002-2025',
    tripId: 'TRIP002',
    tripDate: '2025-01-14',
    clientName: 'บริษัท XYZ อุตสาหกรรม',
    clientLocation: 'นิคมอุตสาหกรรมบางพลี',
    vehicleInfo: {
      plate: 'กค-5678',
      driver: 'สมหญิง รักงาน'
    },
    originalWeight: 800,
    currentWeight: 800,
    weightAtClient: 800,
    weightAtCompany: 800,
    weightDifference: 0,
    materials: [
      {
        type: 'อลูมิเนียม',
        estimatedPercentage: 70,
        estimatedWeight: 560,
        actualWeight: 560,
        quality: 'excellent',
        notes: 'อลูมิเนียมบริสุทธิ์'
      },
      {
        type: 'พลาสติก',
        estimatedPercentage: 30,
        estimatedWeight: 240,
        actualWeight: 240,
        quality: 'fair',
        notes: 'ต้องทำความสะอาด'
      }
    ],
    bags: [
      {
        id: 'bag5',
        tagNumber: 'BAG003',
        weight: 400,
        materials: [
          { type: 'อลูมิเนียม', percentage: 90, weight: 360 },
          { type: 'พลาสติก', percentage: 10, weight: 40 }
        ],
        status: 'original',
        createdAt: '2025-01-14T14:20:00',
        notes: 'ส่วนใหญ่เป็นอลูมิเนียม'
      },
      {
        id: 'bag6',
        tagNumber: 'BAG004',
        weight: 400,
        materials: [
          { type: 'อลูมิเนียม', percentage: 50, weight: 200 },
          { type: 'พลาสติก', percentage: 50, weight: 200 }
        ],
        status: 'original',
        createdAt: '2025-01-14T14:20:00',
        notes: 'วัสดุผสม'
      }
    ],
    status: 'completed',
    createdAt: '2025-01-14T13:00:00',
    updatedAt: '2025-01-14T16:00:00',
    notes: 'ล๊อตเล็ก แต่คุณภาพดี',
    photos: {
      clientPhotos: ['client3.jpg'],
      companyPhotos: ['company3.jpg', 'company4.jpg']
    }
  }
];