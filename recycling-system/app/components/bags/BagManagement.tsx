// app/components/bags/BagManagement.tsx (Compact Version)
import React, { useState, useMemo } from 'react';
import { 
  Package,
  Search, 
  Filter,
  Plus,
  Clock,
  CheckCircle,
  Split
} from 'lucide-react';
import { Bag, mockBags, statusLabels } from './types';
import { BagCard } from './BagCard';
import { BagDetails } from './BagDetails';
import { SortModal } from './SortModal';
import { NewBagModal } from './NewBagModal';

const BagManagement: React.FC = () => {
  const [bags, setBags] = useState<Bag[]>(mockBags);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBag, setSelectedBag] = useState<Bag | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showNewBagModal, setShowNewBagModal] = useState(false);

  const filteredBags = useMemo(() => {
    return bags.filter(bag => {
      const matchSearch = bag.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bag.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bag.materials.some(m => m.type.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || bag.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bags, searchTerm, statusFilter]);

  const updateBagStatus = (bagId: string, newStatus: Bag['status']) => {
    setBags(prev => prev.map(bag => 
      bag.id === bagId 
        ? { 
            ...bag, 
            status: newStatus,
            updatedAt: new Date().toISOString(),
            history: [
              ...bag.history,
              {
                id: Date.now().toString(),
                action: `เปลี่ยนสถานะเป็น ${statusLabels[newStatus].label}`,
                timestamp: new Date().toISOString(),
                user: 'ผู้ใช้ปัจจุบัน',
                details: `เปลี่ยนจาก ${statusLabels[bag.status].label} เป็น ${statusLabels[newStatus].label}`
              }
            ]
          }
        : bag
    ));
  };

  const handleSortBag = (bagId: string, sortedMaterials: Array<{ type: string; weight: number; notes: string }>) => {
    const originalBag = bags.find(bag => bag.id === bagId);
    if (!originalBag) return;

    const totalWeight = sortedMaterials.reduce((sum, material) => sum + material.weight, 0);

    const newBags = sortedMaterials.map((material, index) => ({
      id: Date.now().toString() + index,
      tagNumber: `${originalBag.tagNumber}-${String.fromCharCode(65 + index)}`,
      originalWeight: 0,
      currentWeight: material.weight,
      status: 'ready' as const,
      tripId: originalBag.tripId,
      tripDate: originalBag.tripDate,
      clientName: originalBag.clientName,
      materials: [{ type: material.type, percentage: 100, estimatedWeight: material.weight }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentBagId: originalBag.id,
      notes: material.notes,
      history: [{
        id: Date.now().toString(),
        action: `คัดแยกจากเป้ ${originalBag.tagNumber}`,
        timestamp: new Date().toISOString(),
        user: 'ผู้ใช้ปัจจุบัน',
        details: `คัดแยก${material.type} น้ำหนัก ${material.weight} กก.`
      }]
    }));

    setBags(prev => [
      ...prev.filter(bag => bag.id !== bagId),
      ...newBags,
      {
        ...originalBag,
        currentWeight: originalBag.currentWeight - totalWeight,
        status: 'ready' as const,
        childBagIds: newBags.map(bag => bag.id),
        updatedAt: new Date().toISOString(),
        history: [
          ...originalBag.history,
          {
            id: Date.now().toString(),
            action: 'คัดแยกวัสดุ',
            timestamp: new Date().toISOString(),
            user: 'ผู้ใช้ปัจจุบัน',
            details: `คัดแยกเป็น ${newBags.length} เป้ย่อย น้ำหนักรวม ${totalWeight} กก.`
          }
        ]
      }
    ]);
  };

  const handleCreateBag = (bagData: {
    tagNumber: string;
    weight: number;
    clientName: string;
    materials: Array<{ type: string; percentage: number }>;
    notes: string;
  }) => {
    const newBag: Bag = {
      id: Date.now().toString(),
      tagNumber: bagData.tagNumber,
      originalWeight: bagData.weight,
      currentWeight: bagData.weight,
      status: 'preparing',
      tripId: 'MANUAL',
      tripDate: new Date().toISOString().split('T')[0],
      clientName: bagData.clientName,
      materials: bagData.materials.map(material => ({
        ...material,
        estimatedWeight: (bagData.weight * material.percentage) / 100
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: bagData.notes,
      history: [{
        id: Date.now().toString(),
        action: 'สร้างเป้ใหม่',
        timestamp: new Date().toISOString(),
        user: 'ผู้ใช้ปัจจุบัน',
        details: 'สร้างเป้ใหม่ด้วยตนเอง'
      }]
    };

    setBags(prev => [...prev, newBag]);
  };

  const handleViewDetails = (bag: Bag) => {
    setSelectedBag(bag);
    setShowDetails(true);
  };

  const handleSortModal = (bag: Bag) => {
    setSelectedBag(bag);
    setShowSortModal(true);
  };

  return (
    <div className="flex-1 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold text-white">การจัดการเป้</h1>
            <p className="text-xs text-gray-400 mt-1">จัดการและติดตามสถานะของเป้วัสดุรีไซเคิล</p>
          </div>
          <button
            onClick={() => setShowNewBagModal(true)}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-medium transition-colors"
          >
            <Plus size={14} className="mr-1" />
            สร้างเป้ใหม่
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">เป้ทั้งหมด</p>
                <p className="text-lg font-bold text-white">{bags.length}</p>
              </div>
              <Package className="text-blue-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">เตรียมคัดแยก</p>
                <p className="text-lg font-bold text-yellow-400">
                  {bags.filter(bag => bag.status === 'preparing').length}
                </p>
              </div>
              <Clock className="text-yellow-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">ระหว่างคัดแยก</p>
                <p className="text-lg font-bold text-blue-400">
                  {bags.filter(bag => bag.status === 'sorting').length}
                </p>
              </div>
              <Split className="text-blue-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">พร้อมจำหน่าย</p>
                <p className="text-lg font-bold text-green-400">
                  {bags.filter(bag => bag.status === 'ready').length}
                </p>
              </div>
              <CheckCircle className="text-green-400" size={20} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาตามหมายเลขเป้, ลูกค้า, หรือวัสดุ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-800 text-white text-xs rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="flex items-center">
              <Filter className="text-gray-400 mr-2" size={16} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-800 text-white px-3 py-2 text-xs rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="preparing">เตรียมคัดแยก</option>
                <option value="sorting">ระหว่างคัดแยก</option>
                <option value="ready">พร้อมจำหน่าย</option>
                <option value="sold">จำหน่ายแล้ว</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-gray-400">
            แสดงผล {filteredBags.length} จาก {bags.length} เป้
          </p>
        </div>

        {/* Bags Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {filteredBags.map((bag: Bag) => (
            <BagCard 
              key={bag.id} 
              bag={bag} 
              bags={bags}
              onViewDetails={handleViewDetails}
              onUpdateStatus={updateBagStatus}
              onSort={handleSortModal}
            />
          ))}
        </div>

        {filteredBags.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-sm text-gray-400 mb-2">ไม่พบเป้ที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-gray-500">ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่</p>
          </div>
        )}

        {/* Modals */}
        {showDetails && (
          <BagDetails 
            bag={selectedBag} 
            bags={bags}
            onClose={() => setShowDetails(false)} 
          />
        )}
        
        {showSortModal && (
          <SortModal 
            bag={selectedBag}
            onClose={() => setShowSortModal(false)}
            onSort={handleSortBag}
          />
        )}
        
        <NewBagModal 
          isOpen={showNewBagModal}
          onClose={() => setShowNewBagModal(false)}
          onCreateBag={handleCreateBag}
        />
      </div>
    </div>
  );
};

export default BagManagement;