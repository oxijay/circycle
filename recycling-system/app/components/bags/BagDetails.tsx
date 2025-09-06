// app/components/bags/BagDetails.tsx
import React from 'react';
import { ArrowRight, Split, Clock, CheckCircle } from 'lucide-react';
import { Bag, statusLabels } from './types';

interface BagDetailsProps {
  bag: Bag | null;
  bags: Bag[];
  onClose: () => void;
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

const getStatusIcon = (status: Bag['status']) => {
  switch (status) {
    case 'preparing': return Clock;
    case 'sorting': return Split;
    case 'ready': return CheckCircle;
    case 'sold': return CheckCircle;
    default: return Clock;
  }
};

export const BagDetails: React.FC<BagDetailsProps> = ({ bag, bags, onClose }) => {
  if (!bag) return null;

  const StatusIcon = getStatusIcon(bag.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">รายละเอียดเป้ {bag.tagNumber}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">หมายเลขเป้</label>
                <p className="text-white font-semibold">{bag.tagNumber}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">ลูกค้า</label>
                <p className="text-white">{bag.clientName}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">เที่ยว</label>
                <p className="text-white">{bag.tripId}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">สถานะ</label>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm text-white ${statusLabels[bag.status].color}`}>
                  <StatusIcon size={14} className="mr-1" />
                  {statusLabels[bag.status].label}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm">น้ำหนักเดิม</label>
                <p className="text-white font-semibold">{bag.originalWeight.toLocaleString()} กก.</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">น้ำหนักปัจจุบัน</label>
                <p className="text-white font-semibold">{bag.currentWeight.toLocaleString()} กก.</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">วันที่สร้าง</label>
                <p className="text-white">{formatDate(bag.createdAt)}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">อัปเดตล่าสุด</label>
                <p className="text-white">{formatDate(bag.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Materials */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">วัสดุในเป้</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="space-y-3">
                {bag.materials.map((material, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-white">{material.type}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-blue-400">{material.percentage}%</span>
                      <span className="text-gray-400">{material.estimatedWeight.toLocaleString()} กก.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Parent/Child Relationship */}
          {(bag.parentBagId || (bag.childBagIds && bag.childBagIds.length > 0)) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">ความสัมพันธ์เป้</h3>
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                {bag.parentBagId && (
                  <div className="flex items-center text-yellow-400">
                    <ArrowRight size={16} className="mr-2" />
                    คัดแยกจากเป้ {bags.find(b => b.id === bag.parentBagId)?.tagNumber}
                  </div>
                )}
                {bag.childBagIds && bag.childBagIds.length > 0 && (
                  <div>
                    <p className="text-green-400 mb-2 flex items-center">
                      <Split size={16} className="mr-2" />
                      แยกเป็นเป้ย่อย:
                    </p>
                    <div className="space-y-1 ml-6">
                      {bag.childBagIds.map(childId => {
                        const childBag = bags.find(b => b.id === childId);
                        return childBag ? (
                          <p key={childId} className="text-white">
                            {childBag.tagNumber} ({childBag.currentWeight} กก.)
                          </p>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">ประวัติการดำเนินการ</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="space-y-3">
                {bag.history.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-blue-500 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{entry.action}</p>
                        <p className="text-gray-400 text-sm">{entry.details}</p>
                        <p className="text-gray-500 text-xs">โดย {entry.user}</p>
                      </div>
                      <span className="text-gray-400 text-sm">{formatDate(entry.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {bag.notes && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">หมายเหตุ</h3>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-white">{bag.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};