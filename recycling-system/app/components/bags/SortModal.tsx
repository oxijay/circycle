// app/components/bags/SortModal.tsx
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Bag } from './types';

interface SortModalProps {
  bag: Bag | null;
  onClose: () => void;
  onSort: (bagId: string, sortedMaterials: Array<{ type: string; weight: number; notes: string }>) => void;
}

export const SortModal: React.FC<SortModalProps> = ({ bag, onClose, onSort }) => {
  const [sortedMaterials, setSortedMaterials] = useState([
    { type: '', weight: 0, notes: '' }
  ]);

  if (!bag) return null;

  const addMaterial = () => {
    setSortedMaterials([...sortedMaterials, { type: '', weight: 0, notes: '' }]);
  };

  const removeMaterial = (index: number) => {
    setSortedMaterials(sortedMaterials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: keyof typeof sortedMaterials[0], value: string | number) => {
    setSortedMaterials(prev => prev.map((material, i) => 
      i === index ? { ...material, [field]: value } : material
    ));
  };

  const totalWeight = sortedMaterials.reduce((sum, material) => sum + material.weight, 0);

  const handleSort = () => {
    const validMaterials = sortedMaterials.filter(material => material.type && material.weight > 0);
    onSort(bag.id, validMaterials);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">คัดแยกเป้ {bag.tagNumber}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-400 mt-2">น้ำหนักปัจจุบัน: {bag.currentWeight} กก.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {sortedMaterials.map((material, index) => (
              <div key={index} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-white font-medium">วัสดุที่ {index + 1}</h4>
                  {sortedMaterials.length > 1 && (
                    <button
                      onClick={() => removeMaterial(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">ประเภทวัสดุ</label>
                    <input
                      type="text"
                      value={material.type}
                      onChange={(e) => updateMaterial(index, 'type', e.target.value)}
                      className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="เช่น ทองแดง, เหล็ก, อลูมิเนียม"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">น้ำหนัก (กก.)</label>
                    <input
                      type="number"
                      value={material.weight || ''}
                      onChange={(e) => updateMaterial(index, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-gray-400 text-sm mb-2">หมายเหตุ</label>
                  <input
                    type="text"
                    value={material.notes}
                    onChange={(e) => updateMaterial(index, 'notes', e.target.value)}
                    className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="หมายเหตุเพิ่มเติม"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addMaterial}
            className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center"
          >
            <Plus size={20} className="mr-2" />
            เพิ่มวัสดุ
          </button>

          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">น้ำหนักรวมที่คัดแยก:</span>
              <span className="text-white font-semibold">{totalWeight.toLocaleString()} กก.</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">น้ำหนักคงเหลือ:</span>
              <span className={`font-semibold ${
                bag.currentWeight - totalWeight >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(bag.currentWeight - totalWeight).toLocaleString()} กก.
              </span>
            </div>
            {bag.currentWeight - totalWeight < 0 && (
              <div className="text-red-400 text-sm mt-2">
                ⚠️ น้ำหนักที่คัดแยกเกินกว่าน้ำหนักในเป้
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSort}
              disabled={totalWeight <= 0 || bag.currentWeight - totalWeight < 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              ยืนยันการคัดแยก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};