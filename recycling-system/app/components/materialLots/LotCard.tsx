// app/components/materialLots/LotCard.tsx
import React from 'react';
import { 
  Package,
  Eye,
  Truck,
  MapPin,
  Scale,
  Calendar,
  User,
  Clock,
  CheckCircle,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { MaterialLot, lotStatusLabels, materialQualityLabels } from './types';

interface LotCardProps {
  lot: MaterialLot;
  onViewDetails: (lot: MaterialLot) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusIcon = (status: MaterialLot['status']) => {
  switch (status) {
    case 'pending': return Clock;
    case 'processing': return Settings;
    case 'completed': return CheckCircle;
    case 'shipped': return Truck;
    default: return Clock;
  }
};

export const LotCard: React.FC<LotCardProps> = ({ lot, onViewDetails }) => {
  const StatusIcon = getStatusIcon(lot.status);
  const weightDiffPercentage = lot.originalWeight > 0 
    ? Math.abs(lot.weightDifference / lot.originalWeight * 100) 
    : 0;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <Package className="text-blue-400 mr-3" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-white">{lot.lotNumber}</h3>
            <p className="text-gray-400 text-sm">{lot.clientName}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium text-white flex items-center ${lotStatusLabels[lot.status].color}`}>
          <StatusIcon size={12} className="mr-1" />
          {lotStatusLabels[lot.status].label}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center text-gray-400 text-xs mb-1">
            <Calendar size={12} className="mr-1" />
            วันที่เก็บขน
          </div>
          <p className="text-white font-semibold">{formatDate(lot.tripDate)}</p>
        </div>
        <div>
          <div className="flex items-center text-gray-400 text-xs mb-1">
            <Truck size={12} className="mr-1" />
            รถขนส่ง
          </div>
          <p className="text-white font-semibold">{lot.vehicleInfo.plate}</p>
        </div>
      </div>

      {/* Location */}
      <div className="mb-4">
        <div className="flex items-center text-gray-400 text-xs mb-1">
          <MapPin size={12} className="mr-1" />
          สถานที่
        </div>
        <p className="text-white text-sm">{lot.clientLocation}</p>
      </div>

      {/* Weight Info */}
      <div className="bg-gray-700 p-3 rounded-lg mb-4">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-gray-400">น้ำหนักเดิม</p>
            <p className="text-white font-semibold">{lot.originalWeight.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">น้ำหนักปัจจุบัน</p>
            <p className="text-white font-semibold">{lot.currentWeight.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">ส่วนต่าง</p>
            <div className="flex items-center justify-center">
              <p className={`font-semibold ${
                lot.weightDifference === 0 ? 'text-green-400' : 
                Math.abs(lot.weightDifference) <= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {lot.weightDifference > 0 ? '+' : ''}{lot.weightDifference}
              </p>
              {Math.abs(lot.weightDifference) > 50 && (
                <AlertTriangle size={12} className="text-red-400 ml-1" />
              )}
            </div>
          </div>
        </div>
        {weightDiffPercentage > 5 && (
          <div className="mt-2 text-center">
            <span className="text-red-400 text-xs">
              ⚠️ ส่วนต่าง {weightDiffPercentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Materials Summary */}
      <div className="mb-4">
        <p className="text-gray-400 text-xs mb-2">วัสดุหลัก</p>
        <div className="space-y-1">
          {lot.materials.slice(0, 3).map((material, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-white text-sm">{material.type}</span>
                <span className={`ml-2 text-xs ${materialQualityLabels[material.quality].color}`}>
                  ({materialQualityLabels[material.quality].label})
                </span>
              </div>
              <span className="text-blue-400 text-sm">
                {material.actualWeight ? material.actualWeight.toLocaleString() : material.estimatedWeight.toLocaleString()} กก.
              </span>
            </div>
          ))}
          {lot.materials.length > 3 && (
            <p className="text-gray-500 text-xs">และอีก {lot.materials.length - 3} ประเภท...</p>
          )}
        </div>
      </div>

      {/* Bags Summary */}
      <div className="mb-4">
        <p className="text-gray-400 text-xs mb-2">เป้ทั้งหมด</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-white font-semibold">{lot.bags.length}</p>
              <p className="text-gray-400 text-xs">เป้รวม</p>
            </div>
            <div className="text-center">
              <p className="text-green-400 font-semibold">
                {lot.bags.filter(bag => bag.status === 'sub-bag').length}
              </p>
              <p className="text-gray-400 text-xs">เป้ย่อย</p>
            </div>
            <div className="text-center">
              <p className="text-yellow-400 font-semibold">
                {lot.bags.filter(bag => bag.status === 'original').length}
              </p>
              <p className="text-gray-400 text-xs">ยังไม่แยก</p>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Info */}
      <div className="mb-4">
        <div className="flex items-center text-gray-400 text-xs mb-1">
          <User size={12} className="mr-1" />
          พนักงานขับรถ
        </div>
        <p className="text-white text-sm">{lot.vehicleInfo.driver}</p>
      </div>

      {/* Notes Preview */}
      {lot.notes && (
        <div className="mb-4 bg-gray-700 p-2 rounded">
          <p className="text-gray-400 text-xs mb-1">หมายเหตุ</p>
          <p className="text-white text-sm truncate">{lot.notes}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={() => onViewDetails(lot)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm w-full justify-center"
        >
          <Eye size={16} className="mr-2" />
          ดูรายละเอียดและเป้ย่อย
        </button>
      </div>
    </div>
  );
};