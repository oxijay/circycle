// app/components/materialLots/LotDetails.tsx
import React, { useState } from 'react';
import { 
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  Scale,
  Image,
  FileText,
  Split,
  ArrowRight,
  Eye,
  Download,
  Clock,
  Settings,
  CheckCircle
} from 'lucide-react';
import { MaterialLot, lotStatusLabels, materialQualityLabels } from './types';

interface LotDetailsProps {
  lot: MaterialLot | null;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
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

export const LotDetails: React.FC<LotDetailsProps> = ({ lot, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'bags' | 'photos'>('overview');

  if (!lot) return null;

  const StatusIcon = getStatusIcon(lot.status);

  const tabs = [
    { id: 'overview' as const, label: 'ภาพรวม', icon: FileText },
    { id: 'materials' as const, label: 'วัสดุ', icon: Package },
    { id: 'bags' as const, label: 'เป้และเป้ย่อย', icon: Split },
    { id: 'photos' as const, label: 'รูปภาพ', icon: Image }
  ];

  const originalBags = lot.bags.filter(bag => bag.status === 'original');
  const sortedBags = lot.bags.filter(bag => bag.status === 'sorted');
  const subBags = lot.bags.filter(bag => bag.status === 'sub-bag');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={onClose}
                className="mr-4 p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="text-gray-400" size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">{lot.lotNumber}</h2>
                <p className="text-gray-400">{lot.clientName}</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium text-white flex items-center ${lotStatusLabels[lot.status].color}`}>
              <StatusIcon size={16} className="mr-2" />
              {lotStatusLabels[lot.status].label}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 flex-shrink-0">
          <div className="flex">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <IconComponent size={16} className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Truck className="mr-2" size={20} />
                    ข้อมูลการขนส่ง
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="text-gray-400 mr-3" size={16} />
                      <div>
                        <p className="text-gray-400 text-sm">วันที่เก็บขน</p>
                        <p className="text-white">{formatDate(lot.tripDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Truck className="text-gray-400 mr-3" size={16} />
                      <div>
                        <p className="text-gray-400 text-sm">รถขนส่ง</p>
                        <p className="text-white">{lot.vehicleInfo.plate}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <User className="text-gray-400 mr-3" size={16} />
                      <div>
                        <p className="text-gray-400 text-sm">พนักงานขับรถ</p>
                        <p className="text-white">{lot.vehicleInfo.driver}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="text-gray-400 mr-3" size={16} />
                      <div>
                        <p className="text-gray-400 text-sm">สถานที่เก็บขน</p>
                        <p className="text-white">{lot.clientLocation}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Scale className="mr-2" size={20} />
                    ข้อมูลน้ำหนัก
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">น้ำหนักที่โรงงาน</p>
                        <p className="text-2xl font-bold text-blue-400">{lot.weightAtClient.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">กิโลกรัม</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-sm">น้ำหนักที่บริษัท</p>
                        <p className="text-2xl font-bold text-green-400">{lot.weightAtCompany.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">กิโลกรัม</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">ส่วนต่างน้ำหนัก</span>
                        <span className={`font-bold ${
                          lot.weightDifference === 0 ? 'text-green-400' :
                          Math.abs(lot.weightDifference) <= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {lot.weightDifference > 0 ? '+' : ''}{lot.weightDifference} กก.
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-500 text-sm">
                          {lot.weightDifference === 0 ? '✓ น้ำหนักตรงกัน' :
                           Math.abs(lot.weightDifference) <= 50 ? '⚠️ ส่วนต่างในเกณฑ์ปกติ' :
                           '❌ ส่วนต่างสูง ควรตรวจสอบ'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">สรุปภาพรวม</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{lot.materials.length}</p>
                    <p className="text-gray-400 text-sm">ประเภทวัสดุ</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{lot.bags.length}</p>
                    <p className="text-gray-400 text-sm">เป้ทั้งหมด</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{subBags.length}</p>
                    <p className="text-gray-400 text-sm">เป้ย่อย</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">{originalBags.length}</p>
                    <p className="text-gray-400 text-sm">ยังไม่แยก</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {lot.notes && (
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">หมายเหตุ</h3>
                  <p className="text-gray-300">{lot.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">รายการวัสดุทั้งหมด</h3>
                <div className="text-sm text-gray-400">
                  รวม {lot.materials.reduce((sum, m) => sum + (m.actualWeight || m.estimatedWeight), 0).toLocaleString()} กก.
                </div>
              </div>
              
              <div className="grid gap-4">
                {lot.materials.map((material, index) => (
                  <div key={index} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{material.type}</h4>
                        <span className={`text-sm ${materialQualityLabels[material.quality].color}`}>
                          คุณภาพ: {materialQualityLabels[material.quality].label}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-400">
                          {(material.actualWeight || material.estimatedWeight).toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-sm">กิโลกรัม</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">เปอร์เซ็นต์โดยประมาณ</p>
                        <p className="text-white font-semibold">{material.estimatedPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">น้ำหนักประมาณการ</p>
                        <p className="text-white font-semibold">{material.estimatedWeight.toLocaleString()} กก.</p>
                      </div>
                    </div>
                    
                    {material.actualWeight && material.actualWeight !== material.estimatedWeight && (
                      <div className="bg-gray-700 p-3 rounded-lg mb-4">
                        <p className="text-green-400 text-sm font-medium">น้ำหนักจริงหลังชั่ง</p>
                        <div className="flex justify-between items-center">
                          <span className="text-white">{material.actualWeight.toLocaleString()} กก.</span>
                          <span className={`text-sm ${
                            material.actualWeight > material.estimatedWeight ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {material.actualWeight > material.estimatedWeight ? '+' : ''}
                            {(material.actualWeight - material.estimatedWeight).toLocaleString()} กก.
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {material.notes && (
                      <div className="bg-gray-700 p-3 rounded-lg">
                        <p className="text-gray-400 text-sm">หมายเหตุ</p>
                        <p className="text-white text-sm">{material.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bags Tab */}
          {activeTab === 'bags' && (
            <div className="space-y-6">
              {/* Original Bags */}
              {originalBags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Package className="mr-2" size={20} />
                    เป้เดิม ({originalBags.length} เป้)
                  </h3>
                  <div className="grid gap-4">
                    {originalBags.map(bag => (
                      <div key={bag.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-lg font-semibold text-white">{bag.tagNumber}</h4>
                            <p className="text-gray-400 text-sm">น้ำหนัก: {bag.weight.toLocaleString()} กก.</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                            เป้เดิม
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-gray-400 text-sm mb-2">วัสดุในเป้</p>
                          <div className="space-y-1">
                            {bag.materials.map((material, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-white text-sm">{material.type}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-blue-400 text-sm">{material.percentage}%</span>
                                  <span className="text-gray-400 text-sm">({material.weight.toLocaleString()} กก.)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {bag.notes && (
                          <div className="mt-3 bg-gray-700 p-2 rounded">
                            <p className="text-gray-400 text-xs">หมายเหตุ</p>
                            <p className="text-white text-sm">{bag.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sorted Bags with Sub-bags */}
              {sortedBags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Split className="mr-2" size={20} />
                    เป้ที่แยกแล้ว ({sortedBags.length} เป้)
                  </h3>
                  <div className="space-y-6">
                    {sortedBags.map(parentBag => {
                      const childBags = lot.bags.filter(bag => bag.parentBagId === parentBag.id);
                      return (
                        <div key={parentBag.id} className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                          {/* Parent Bag */}
                          <div className="mb-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="text-lg font-semibold text-white">{parentBag.tagNumber}</h4>
                                <p className="text-gray-400 text-sm">น้ำหนักเดิม: {parentBag.weight.toLocaleString()} กก.</p>
                              </div>
                              <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full">
                                แยกแล้ว
                              </span>
                            </div>
                            
                            {parentBag.notes && (
                              <div className="bg-gray-700 p-2 rounded mb-3">
                                <p className="text-gray-400 text-xs">หมายเหตุ</p>
                                <p className="text-white text-sm">{parentBag.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Sub-bags */}
                          {childBags.length > 0 && (
                            <div className="ml-4 border-l-2 border-gray-600 pl-4">
                              <h5 className="text-white font-medium mb-3 flex items-center">
                                <ArrowRight className="mr-1" size={16} />
                                เป้ย่อย ({childBags.length} เป้)
                              </h5>
                              <div className="space-y-3">
                                {childBags.map(childBag => (
                                  <div key={childBag.id} className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h6 className="font-semibold text-white">{childBag.tagNumber}</h6>
                                        <p className="text-gray-400 text-sm">น้ำหนัก: {childBag.weight.toLocaleString()} กก.</p>
                                      </div>
                                      <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                                        เป้ย่อย
                                      </span>
                                    </div>
                                    
                                    <div className="mb-2">
                                      <p className="text-gray-400 text-xs mb-1">วัสดุ</p>
                                      <div className="space-y-1">
                                        {childBag.materials.map((material, idx) => (
                                          <div key={idx} className="flex justify-between items-center">
                                            <span className="text-white text-sm">{material.type}</span>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-green-400 text-sm">{material.percentage}%</span>
                                              <span className="text-gray-400 text-sm">({material.weight.toLocaleString()} กก.)</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {childBag.notes && (
                                      <div className="bg-gray-600 p-2 rounded">
                                        <p className="text-gray-400 text-xs">หมายเหตุ</p>
                                        <p className="text-white text-sm">{childBag.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-800 p-5 rounded-lg border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">สรุปเป้</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{originalBags.length}</p>
                    <p className="text-gray-400 text-sm">เป้เดิม</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{sortedBags.length}</p>
                    <p className="text-gray-400 text-sm">เป้ที่แยกแล้ว</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{subBags.length}</p>
                    <p className="text-gray-400 text-sm">เป้ย่อย</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* Client Photos */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">รูปภาพที่โรงงานลูกค้า</h3>
                {lot.photos.clientPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {lot.photos.clientPhotos.map((photo, index) => (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg">
                        <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                          <Image className="text-gray-500" size={48} />
                        </div>
                        <p className="text-gray-400 text-sm text-center">{photo}</p>
                        <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center justify-center">
                          <Eye size={14} className="mr-1" />
                          ดู
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    ไม่มีรูปภาพจากโรงงานลูกค้า
                  </div>
                )}
              </div>

              {/* Company Photos */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">รูปภาพที่บริษัท</h3>
                {lot.photos.companyPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {lot.photos.companyPhotos.map((photo, index) => (
                      <div key={index} className="bg-gray-800 p-4 rounded-lg">
                        <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                          <Image className="text-gray-500" size={48} />
                        </div>
                        <p className="text-gray-400 text-sm text-center">{photo}</p>
                        <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center justify-center">
                          <Eye size={14} className="mr-1" />
                          ดู
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    ไม่มีรูปภาพจากบริษัท
                  </div>
                )}
              </div>

              {/* Download All */}
              {(lot.photos.clientPhotos.length > 0 || lot.photos.companyPhotos.length > 0) && (
                <div className="text-center">
                  <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg flex items-center mx-auto">
                    <Download size={16} className="mr-2" />
                    ดาวน์โหลดรูปภาพทั้งหมด
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};