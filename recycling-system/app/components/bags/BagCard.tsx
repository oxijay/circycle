// app/components/bags/BagCard.tsx (Compact Version)
import React from 'react';
import { 
  Package,
  Eye,
  Clock,
  CheckCircle,
  Split,
  ArrowRight
} from 'lucide-react';
import { Bag, statusLabels, Material } from './types';

interface BagCardProps {
  bag: Bag;
  bags: Bag[];
  onViewDetails: (bag: Bag) => void;
  onUpdateStatus: (bagId: string, newStatus: Bag['status']) => void;
  onSort: (bag: Bag) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusIcon = (status: Bag['status']) => {
  switch (status) {
    case 'preparing': return Clock;
    case 'sorting': return Split;
    case 'ready': return CheckCircle;
    case 'sold': return CheckCircle;
    default: return Clock;
  }
};

export const BagCard: React.FC<BagCardProps> = ({ 
  bag, 
  bags, 
  onViewDetails, 
  onUpdateStatus, 
  onSort 
}) => {
  const StatusIcon = getStatusIcon(bag.status);
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center min-w-0 flex-1">
          <Package className="text-blue-400 mr-2 flex-shrink-0" size={16} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white truncate">{bag.tagNumber}</h3>
            <p className="text-xs text-gray-400 truncate">{bag.clientName}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium text-white flex items-center ${statusLabels[bag.status].color}`}>
          <StatusIcon size={10} className="mr-1" />
          {statusLabels[bag.status].label}
        </div>
      </div>

      {/* Weight and Date */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">น้ำหนักปัจจุบัน</p>
          <p className="text-sm font-semibold text-white">{bag.currentWeight.toLocaleString()} กก.</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">วันที่สร้าง</p>
          <p className="text-sm font-semibold text-white">{formatDate(bag.createdAt)}</p>
        </div>
      </div>

      {/* Materials */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-2">วัสดุในเป้</p>
        <div className="space-y-1">
          {bag.materials.slice(0, 2).map((material: Material, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-xs text-white">{material.type}</span>
              <span className="text-xs text-blue-400">{material.percentage}%</span>
            </div>
          ))}
          {bag.materials.length > 2 && (
            <p className="text-xs text-gray-500">และอีก {bag.materials.length - 2} ประเภท</p>
          )}
        </div>
      </div>

      {/* Relationship indicators */}
      {bag.parentBagId && (
        <div className="bg-gray-800 px-2 py-1 rounded mb-3">
          <p className="text-yellow-400 text-xs flex items-center">
            <ArrowRight size={10} className="mr-1" />
            คัดแยกจากเป้ {bags.find(b => b.id === bag.parentBagId)?.tagNumber}
          </p>
        </div>
      )}

      {bag.childBagIds && bag.childBagIds.length > 0 && (
        <div className="bg-gray-800 px-2 py-1 rounded mb-3">
          <p className="text-green-400 text-xs flex items-center">
            <Split size={10} className="mr-1" />
            แยกเป็น {bag.childBagIds.length} เป้ย่อย
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-800">
        <button
          onClick={() => onViewDetails(bag)}
          className="flex items-center text-blue-400 hover:text-blue-300 text-xs transition-colors"
        >
          <Eye size={12} className="mr-1" />
          รายละเอียด
        </button>

        <div className="flex space-x-1">
          {bag.status === 'preparing' && (
            <button
              onClick={() => onUpdateStatus(bag.id, 'sorting')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
            >
              เริ่มคัดแยก
            </button>
          )}
          {bag.status === 'sorting' && (
            <>
              <button
                onClick={() => onSort(bag)}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
              >
                คัดแยก
              </button>
              <button
                onClick={() => onUpdateStatus(bag.id, 'ready')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition-colors"
              >
                เสร็จสิ้น
              </button>
            </>
          )}
          {bag.status === 'ready' && (
            <button
              onClick={() => onUpdateStatus(bag.id, 'sold')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs transition-colors"
            >
              จำหน่าย
            </button>
          )}
        </div>
      </div>
    </div>
  );
};