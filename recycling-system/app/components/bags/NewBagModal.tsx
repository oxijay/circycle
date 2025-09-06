// app/components/bags/NewBagModal.tsx
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface NewBagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBag: (bagData: {
    tagNumber: string;
    weight: number;
    clientName: string;
    materials: Array<{ type: string; percentage: number }>;
    notes: string;
  }) => void;
}

export const NewBagModal: React.FC<NewBagModalProps> = ({ isOpen, onClose, onCreateBag }) => {
  const [newBagData, setNewBagData] = useState({
    tagNumber: '',
    weight: 0,
    clientName: '',
    materials: [{ type: '', percentage: 0 }],
    notes: ''
  });

  if (!isOpen) return null;

  const addMaterial = () => {
    setNewBagData(prev => ({
      ...prev,
      materials: [...prev.materials, { type: '', percentage: 0 }]
    }));
  };

  const updateMaterial = (index: number, field: keyof typeof newBagData.materials[0], value: string | number) => {
    setNewBagData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const removeMaterial = (index: number) => {
    setNewBagData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const totalPercentage = newBagData.materials.reduce((sum, material) => sum + material.percentage, 0);

  const handleCreate = () => {
    onCreateBag(newBagData);
    onClose();
    setNewBagData({
      tagNumber: '',
      weight: 0,
      clientName: '',
      materials: [{ type: '', percentage: 0 }],
      notes: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">สร้างเป้ใหม่</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">หมายเลขเป้ *</label>
              <input
                type="text"
                value={newBagData.tagNumber}
                onChange={(e) => setNewBagData(prev => ({ ...prev, tagNumber: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="เช่น BAG001"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">น้ำหนัก (กก.) *</label>
              <input
                type="number"
                value={newBagData.weight || ''}
                onChange={(e) => setNewBagData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">ชื่อลูกค้า *</label>
            <input
              type="text"
              value={newBagData.clientName}
              onChange={(e) => setNewBagData(prev => ({ ...prev, clientName: e.target.value }))}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="ชื่อโรงงานหรือลูกค้า"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-gray-400 text-sm">วัสดุในเป้</label>
              <button
                onClick={addMaterial}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                เพิ่มวัสดุ
              </button>
            </div>
            
            <div className="space-y-3">
              {newBagData.materials.map((material, index) => (
                <div key={index} className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white">วัสดุที่ {index + 1}</span>
                    {newBagData.materials.length > 1 && (
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
                      <label className="block text-gray-400 text-xs mb-1">ประเภทวัสดุ</label>
                      <input
                        type="text"
                        value={material.type}
                        onChange={(e) => updateMaterial(index, 'type', e.target.value)}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        placeholder="เช่น ทองแดง, เหล็ก"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">เปอร์เซ็นต์</label>
                      <input
                        type="number"
                        value={material.percentage || ''}
                        onChange={(e) => updateMaterial(index, 'percentage', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 text-sm">
              <span className="text-gray-400">รวมเปอร์เซ็นต์: </span>
              <span className={`font-semibold ${
                totalPercentage === 100 ? 'text-green-400' : 
                totalPercentage < 100 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {totalPercentage}%
              </span>
              {totalPercentage !== 100 && (
                <span className="text-gray-500 ml-2">
                  (ควรรวมเป็น 100%)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">หมายเหตุ</label>
            <textarea
              value={newBagData.notes}
              onChange={(e) => setNewBagData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              disabled={!newBagData.tagNumber || !newBagData.clientName || newBagData.weight <= 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              สร้างเป้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};