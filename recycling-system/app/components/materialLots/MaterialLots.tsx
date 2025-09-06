// app/components/materialLots/MaterialLots.tsx (Compact Version)
import React, { useState, useMemo } from 'react';
import { 
  Layers,
  Search, 
  Filter,
  Calendar,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  Scale
} from 'lucide-react';
import { MaterialLot, mockMaterialLots, lotStatusLabels } from './types';
import { LotCard } from './LotCard';
import { LotDetails } from './LotDetails';

const MaterialLots: React.FC = () => {
  const [lots, setLots] = useState<MaterialLot[]>(mockMaterialLots);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedLot, setSelectedLot] = useState<MaterialLot | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      const matchSearch = lot.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lot.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lot.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lot.vehicleInfo.plate.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || lot.status === statusFilter;
      
      let matchDate = true;
      if (dateFilter !== 'all') {
        const lotDate = new Date(lot.tripDate);
        const today = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchDate = lotDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchDate = lotDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchDate = lotDate >= monthAgo;
            break;
        }
      }
      
      return matchSearch && matchStatus && matchDate;
    });
  }, [lots, searchTerm, statusFilter, dateFilter]);

  const handleViewDetails = (lot: MaterialLot) => {
    setSelectedLot(lot);
    setShowDetails(true);
  };

  const stats = useMemo(() => {
    const totalWeight = lots.reduce((sum, lot) => sum + lot.currentWeight, 0);
    const totalBags = lots.reduce((sum, lot) => sum + lot.bags.length, 0);
    const totalSubBags = lots.reduce((sum, lot) => sum + lot.bags.filter(bag => bag.status === 'sub-bag').length, 0);
    const avgWeightDiff = lots.length > 0 
      ? lots.reduce((sum, lot) => sum + Math.abs(lot.weightDifference), 0) / lots.length 
      : 0;

    return {
      totalLots: lots.length,
      totalWeight,
      totalBags,
      totalSubBags,
      avgWeightDiff,
      pendingLots: lots.filter(lot => lot.status === 'pending').length,
      processingLots: lots.filter(lot => lot.status === 'processing').length,
      completedLots: lots.filter(lot => lot.status === 'completed').length,
      shippedLots: lots.filter(lot => lot.status === 'shipped').length
    };
  }, [lots]);

  return (
    <div className="flex-1 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center">
              <Layers className="mr-2" size={20} />
              รายการวัสดุแต่ละล๊อต
            </h1>
            <p className="text-xs text-gray-400 mt-1">ติดตามและจัดการวัสดุจากโรงงานลูกค้า รวมถึงเป้ย่อยที่คัดแยกแล้ว</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">อัปเดตล่าสุด</p>
            <p className="text-xs text-white font-medium">{new Date().toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">ล๊อตทั้งหมด</p>
                <p className="text-lg font-bold text-white">{stats.totalLots}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="text-green-400 mr-1" size={10} />
                  <span className="text-green-400 text-xs">+{stats.completedLots} เสร็จสิ้น</span>
                </div>
              </div>
              <Package className="text-blue-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">น้ำหนักรวม</p>
                <p className="text-lg font-bold text-white">{stats.totalWeight.toLocaleString()}</p>
                <p className="text-xs text-gray-500">กิโลกรัม</p>
              </div>
              <Scale className="text-green-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">เป้ทั้งหมด</p>
                <p className="text-lg font-bold text-white">{stats.totalBags}</p>
                <p className="text-green-400 text-xs">เป้ย่อย: {stats.totalSubBags}</p>
              </div>
              <Package className="text-purple-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">ส่วนต่างเฉลี่ย</p>
                <p className="text-lg font-bold text-yellow-400">{stats.avgWeightDiff.toFixed(1)}</p>
                <p className="text-xs text-gray-500">กิโลกรัม</p>
              </div>
              <Scale className="text-yellow-400" size={20} />
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-white mb-3">สถานะล๊อต</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="text-yellow-400 mr-1" size={14} />
                <span className="text-yellow-400 text-xs font-medium">รอดำเนินการ</span>
              </div>
              <p className="text-lg font-bold text-white">{stats.pendingLots}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Settings className="text-blue-400 mr-1" size={14} />
                <span className="text-blue-400 text-xs font-medium">กำลังดำเนินการ</span>
              </div>
              <p className="text-lg font-bold text-white">{stats.processingLots}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle className="text-green-400 mr-1" size={14} />
                <span className="text-green-400 text-xs font-medium">เสร็จสิ้น</span>
              </div>
              <p className="text-lg font-bold text-white">{stats.completedLots}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Truck className="text-gray-400 mr-1" size={14} />
                <span className="text-gray-400 text-xs font-medium">จัดส่งแล้ว</span>
              </div>
              <p className="text-lg font-bold text-white">{stats.shippedLots}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาตามหมายเลขล๊อต, ลูกค้า, เที่ยว, หรือทะเบียนรถ..."
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
                <option value="pending">รอดำเนินการ</option>
                <option value="processing">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="shipped">จัดส่งแล้ว</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <Calendar className="text-gray-400 mr-2" size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-gray-800 text-white px-3 py-2 text-xs rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">ช่วงเวลาทั้งหมด</option>
                <option value="today">วันนี้</option>
                <option value="week">สัปดาห์นี้</option>
                <option value="month">เดือนนี้</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-gray-400">
            แสดงผล {filteredLots.length} จาก {lots.length} ล๊อต
          </p>
        </div>

        {/* Lots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {filteredLots.map(lot => (
            <LotCard 
              key={lot.id} 
              lot={lot} 
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredLots.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-sm text-gray-400 mb-2">ไม่พบล๊อตที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-gray-500">ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่</p>
          </div>
        )}

        {/* Modal */}
        {showDetails && (
          <LotDetails 
            lot={selectedLot} 
            onClose={() => setShowDetails(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default MaterialLots;