// components/trips/NewTrip.tsx
"use client"

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Camera, 
  Upload, 
  Save, 
  Plus, 
  Minus, 
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Scale,
  Truck,
  Building,
  Package
} from 'lucide-react';

// Types
interface Vehicle {
  id: number;
  plate: string;
  driver: string;
  status: 'available' | 'in_use' | 'maintenance';
}

interface BagData {
  id: string;
  weight: number;
  tagNumber: string;
  notes: string;
}

interface TripFormData {
  vehicleId: string;
  clientCompany: string;
  itemsList: string;
  weightAtClient: number;
  weightAtCompany: number;
  clientPhotos: File[];
  companyPhotos: File[];
  notes: string;
  bags: BagData[];
}

interface StepProps {
  tripData: TripFormData;
  updateTripData: <K extends keyof TripFormData>(field: K, value: TripFormData[K]) => void;
  onNext: () => void;
  onPrev: () => void;
  isValid: boolean;
}

// Mock data
const MOCK_VEHICLES: Vehicle[] = [
  { id: 1, plate: 'กข-1234', driver: 'สมชาย ใจดี', status: 'available' },
  { id: 2, plate: 'กค-5678', driver: 'สมหญิง รักงาน', status: 'available' },
  { id: 3, plate: 'กง-9012', driver: 'สมศักดิ์ ขยัน', status: 'available' }
];

// Progress Bar Component
const ProgressBar: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: 'รถออกจากบริษัท', icon: Truck },
    { number: 2, title: 'ถึงโรงงานลูกค้า', icon: Building },
    { number: 3, title: 'กลับบริษัท', icon: Scale },
    { number: 4, title: 'บรรจุเป้', icon: Package }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isActive = currentStep >= step.number;
          const isCompleted = currentStep > step.number;
          
          return (
            <div key={step.number} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-600 border-green-600'
                  : isActive
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-600 bg-gray-800'
              }`}>
                {isCompleted ? (
                  <Check className="text-white" size={20} />
                ) : (
                  <IconComponent className={`${isActive ? 'text-white' : 'text-gray-400'}`} size={20} />
                )}
                {isActive && !isCompleted && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-pulse"></div>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                  currentStep > step.number ? 'bg-green-600' : 'bg-gray-600'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-3 text-sm">
        {steps.map(step => (
          <span key={step.number} className={`font-medium ${
            currentStep >= step.number ? 'text-white' : 'text-gray-400'
          }`}>
            {step.title}
          </span>
        ))}
      </div>
    </div>
  );
};

// Photo Upload Component
const PhotoUpload: React.FC<{
  photos: File[];
  onChange: (files: File[]) => void;
  title: string;
  maxFiles?: number;
}> = ({ photos, onChange, title, maxFiles = 3 }) => {
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = maxFiles - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (filesToAdd.length > 0) {
      onChange([...photos, ...filesToAdd]);
    }
  }, [photos, onChange, maxFiles]);

  const removePhoto = useCallback((index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  }, [photos, onChange]);

  return (
    <div>
      <label className="block text-gray-300 text-sm font-medium mb-2">
        {title} (สูงสุด {maxFiles} รูป)
      </label>
      
      <div className="space-y-3">
        {/* Photo Preview */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Minus size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload Buttons */}
        {photos.length < maxFiles && (
          <div className="flex space-x-3">
            <label className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer transition duration-200">
              <Camera className="mr-2" size={18} />
              ถ่ายรูป
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
            </label>
            
            <label className="flex items-center bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer transition duration-200">
              <Upload className="mr-2" size={18} />
              เลือกรูป
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
            </label>
          </div>
        )}
        
        <p className="text-gray-400 text-xs">
          เลือกได้ {maxFiles - photos.length} รูปอีก
        </p>
      </div>
    </div>
  );
};

// Step 1: Vehicle Selection
const Step1: React.FC<StepProps> = ({ tripData, updateTripData, onNext, isValid }) => {
  const selectedVehicle = useMemo(() => 
    MOCK_VEHICLES.find(v => v.id.toString() === tripData.vehicleId),
    [tripData.vehicleId]
  );

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center mb-6">
        <div className="bg-blue-600 p-3 rounded-full mr-4">
          <Truck className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-white">รถขนของออกจากบริษัท</h3>
          <p className="text-gray-400">เลือกรถและกรอกข้อมูลการเดินทาง</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-3">
              เลือกรถที่จะใช้งาน <span className="text-red-400">*</span>
            </label>
            
            <div className="space-y-3">
              {MOCK_VEHICLES.filter(v => v.status === 'available').map(vehicle => (
                <div
                  key={vehicle.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    tripData.vehicleId === vehicle.id.toString()
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => updateTripData('vehicleId', vehicle.id.toString())}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        tripData.vehicleId === vehicle.id.toString()
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-400'
                      }`} />
                      <div>
                        <p className="text-white font-medium">{vehicle.plate}</p>
                        <p className="text-gray-400 text-sm">{vehicle.driver}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                        พร้อมใช้งาน
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedVehicle && (
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2">รถที่เลือก</h4>
              <div className="text-white">
                <p><strong>ทะเบียน:</strong> {selectedVehicle.plate}</p>
                <p><strong>คนขับ:</strong> {selectedVehicle.driver}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Trip Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              บริษัท/โรงงานที่จะไป <span className="text-red-400">*</span>
            </label>
            <input 
              type="text" 
              value={tripData.clientCompany}
              onChange={(e) => updateTripData('clientCompany', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="เช่น บริษัท ABC จำกัด"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              รายการสินค้าที่จะไปรับ <span className="text-red-400">*</span>
            </label>
            <textarea 
              value={tripData.itemsList}
              onChange={(e) => updateTripData('itemsList', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
              rows={6}
              placeholder="กรอกรายการสินค้าที่จะไปรับ&#10;เช่น:&#10;- เศษโลหะเหล็ก&#10;- พลาสติกเหลือใช้&#10;- กระดาษรีไซเคิล"
            />
          </div>
        </div>
      </div>
      
      {/* Validation Alert */}
      {!isValid && (
        <div className="mt-6 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="mr-2 flex-shrink-0" size={20} />
          <span>กรุณากรอกข้อมูลให้ครบถ้วนก่อนไปขั้นตอนถัดไป</span>
        </div>
      )}
      
      <div className="flex justify-end mt-8">
        <button 
          onClick={onNext}
          disabled={!isValid}
          className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          ไปขั้นตอนถัดไป
          <ArrowRight className="ml-2" size={20} />
        </button>
      </div>
    </div>
  );
};

// Step 2: At Client Site
const Step2: React.FC<StepProps> = ({ tripData, updateTripData, onNext, onPrev, isValid }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center mb-6">
        <div className="bg-green-600 p-3 rounded-full mr-4">
          <Building className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-white">ถึงที่โรงงานลูกค้า</h3>
          <p className="text-gray-400">บันทึกน้ำหนักและถ่ายรูปการชั่งน้ำหนัก</p>
        </div>
      </div>
      
      {/* Client Info Summary */}
      <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 mb-6">
        <h4 className="text-white font-medium mb-3">ข้อมูลการเดินทาง</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">ลูกค้า:</span>
            <span className="text-white ml-2">{tripData.clientCompany}</span>
          </div>
          <div>
            <span className="text-gray-400">รถที่ใช้:</span>
            <span className="text-white ml-2">
              {MOCK_VEHICLES.find(v => v.id.toString() === tripData.vehicleId)?.plate}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-gray-400">รายการสินค้า:</span>
          <div className="text-white mt-1 bg-gray-600 p-3 rounded text-sm">
            {tripData.itemsList.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Input */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            น้ำหนักที่รับจากโรงงาน (กก.) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input 
              type="number" 
              step="0.01"
              min="0"
              value={tripData.weightAtClient || ''}
              onChange={(e) => updateTripData('weightAtClient', parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors pr-12"
              placeholder="0.00"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              กก.
            </div>
          </div>
          
          {tripData.weightAtClient > 0 && (
            <div className="mt-3 bg-green-900/30 border border-green-600 text-green-300 px-3 py-2 rounded text-sm">
              น้ำหนัก: {tripData.weightAtClient.toLocaleString()} กิโลกรัม
            </div>
          )}
        </div>
        
        {/* Photo Upload */}
        <div>
          <PhotoUpload
            photos={tripData.clientPhotos}
            onChange={(files) => updateTripData('clientPhotos', files)}
            title="รูปการชั่งน้ำหนักที่โรงงาน"
            maxFiles={3}
          />
        </div>
      </div>
      
      {/* Validation Alert */}
      {!isValid && (
        <div className="mt-6 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="mr-2 flex-shrink-0" size={20} />
          <span>กรุณาบันทึกน้ำหนักก่อนไปขั้นตอนถัดไป</span>
        </div>
      )}
      
      <div className="flex justify-between mt-8">
        <button 
          onClick={onPrev}
          className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          <ArrowLeft className="mr-2" size={20} />
          ย้อนกลับ
        </button>
        <button 
          onClick={onNext}
          disabled={!isValid}
          className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          ไปขั้นตอนถัดไป
          <ArrowRight className="ml-2" size={20} />
        </button>
      </div>
    </div>
  );
};

// Step 3: Back to Company
const Step3: React.FC<StepProps> = ({ tripData, updateTripData, onNext, onPrev, isValid }) => {
  const weightDiff = useMemo(() => 
    tripData.weightAtClient - tripData.weightAtCompany, 
    [tripData.weightAtClient, tripData.weightAtCompany]
  );
  
  const diffPercentage = useMemo(() => {
    if (tripData.weightAtClient === 0) return 0;
    return ((weightDiff / tripData.weightAtClient) * 100);
  }, [weightDiff, tripData.weightAtClient]);

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center mb-6">
        <div className="bg-orange-600 p-3 rounded-full mr-4">
          <Scale className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-white">ขนกลับบริษัทและชั่งน้ำหนักอีกครั้ง</h3>
          <p className="text-gray-400">บันทึกน้ำหนักสุดท้ายและคำนวณส่วนต่าง</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weight Input */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            น้ำหนักที่บริษัท (กก.) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input 
              type="number" 
              step="0.01"
              min="0"
              value={tripData.weightAtCompany || ''}
              onChange={(e) => updateTripData('weightAtCompany', parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors pr-12"
              placeholder="0.00"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              กก.
            </div>
          </div>
        </div>
        
        {/* Photo Upload */}
        <div>
          <PhotoUpload
            photos={tripData.companyPhotos}
            onChange={(files) => updateTripData('companyPhotos', files)}
            title="รูปการชั่งน้ำหนักที่บริษัท"
            maxFiles={3}
          />
        </div>
      </div>
      
      {/* Notes */}
      <div className="mb-6">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          หมายเหตุ
        </label>
        <textarea 
          value={tripData.notes}
          onChange={(e) => updateTripData('notes', e.target.value)}
          className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
          rows={3}
          placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)..."
        />
      </div>
      
      {/* Weight Difference Summary */}
      {tripData.weightAtClient > 0 && tripData.weightAtCompany > 0 && (
        <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 mb-6">
          <h4 className="text-xl text-white font-semibold mb-4 flex items-center">
            <Scale className="mr-2" size={20} />
            สรุปข้อมูลน้ำหนัก
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-600 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">น้ำหนักที่โรงงาน</p>
              <p className="text-2xl text-blue-400 font-bold">{tripData.weightAtClient.toLocaleString()}</p>
              <p className="text-gray-400 text-xs">กิโลกรัม</p>
            </div>
            
            <div className="bg-gray-600 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">น้ำหนักที่บริษัท</p>
              <p className="text-2xl text-green-400 font-bold">{tripData.weightAtCompany.toLocaleString()}</p>
              <p className="text-gray-400 text-xs">กิโลกรัม</p>
            </div>
            
            <div className="bg-gray-600 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">ส่วนต่างน้ำหนัก</p>
              <p className={`text-2xl font-bold ${
                weightDiff > 0 ? 'text-green-400' : weightDiff < 0 ? 'text-red-400' : 'text-gray-300'
              }`}>
                {weightDiff > 0 ? '+' : ''}{weightDiff.toLocaleString()}
              </p>
              <p className="text-gray-400 text-xs">กิโลกรัม</p>
            </div>
            
            <div className="bg-gray-600 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">เปอร์เซ็นต์ส่วนต่าง</p>
              <p className={`text-2xl font-bold ${
                diffPercentage > 0 ? 'text-green-400' : diffPercentage < 0 ? 'text-red-400' : 'text-gray-300'
              }`}>
                {diffPercentage > 0 ? '+' : ''}{diffPercentage.toFixed(2)}%
              </p>
              <p className="text-gray-400 text-xs">ของน้ำหนักรวม</p>
            </div>
          </div>
          
          {/* Weight Analysis */}
          <div className="mt-4 p-3 rounded-lg border-l-4 ${
            weightDiff === 0 ? 'border-gray-400 bg-gray-600' :
            Math.abs(diffPercentage) <= 2 ? 'border-green-400 bg-green-900/30' :
            Math.abs(diffPercentage) <= 5 ? 'border-yellow-400 bg-yellow-900/30' :
            'border-red-400 bg-red-900/30'
          }">
            <p className="text-white font-medium">
              {weightDiff === 0 ? '✓ น้ำหนักตรงกัน' :
               Math.abs(diffPercentage) <= 2 ? '✓ ส่วนต่างในเกณฑ์ปกติ' :
               Math.abs(diffPercentage) <= 5 ? '⚠️ ส่วนต่างสูงกว่าปกติ' :
               '❌ ส่วนต่างสูงมาก ควรตรวจสอบ'}
            </p>
          </div>
        </div>
      )}
      
      {/* Validation Alert */}
      {!isValid && (
        <div className="mt-6 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="mr-2 flex-shrink-0" size={20} />
          <span>กรุณาบันทึกน้ำหนักที่บริษัทก่อนไปขั้นตอนถัดไป</span>
        </div>
      )}
      
      <div className="flex justify-between mt-8">
        <button 
          onClick={onPrev}
          className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          <ArrowLeft className="mr-2" size={20} />
          ย้อนกลับ
        </button>
        <button 
          onClick={onNext}
          disabled={!isValid}
          className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          ไปขั้นตอนถัดไป
          <ArrowRight className="ml-2" size={20} />
        </button>
      </div>
    </div>
  );
};

// Step 4: Bag Packing
const Step4: React.FC<StepProps & { onComplete: () => void }> = ({ 
  tripData, 
  updateTripData, 
  onPrev, 
  isValid, 
  onComplete 
}) => {
  const addBag = useCallback(() => {
    const newBag: BagData = {
      id: Date.now().toString(),
      weight: 0,
      tagNumber: `BAG${String(tripData.bags.length + 1).padStart(3, '0')}`,
      notes: ''
    };
    updateTripData('bags', [...tripData.bags, newBag]);
  }, [tripData.bags, updateTripData]);

  const removeBag = useCallback((bagId: string) => {
    updateTripData('bags', tripData.bags.filter(bag => bag.id !== bagId));
  }, [tripData.bags, updateTripData]);

  const updateBag = useCallback((bagId: string, field: keyof BagData, value: string | number) => {
    updateTripData('bags', tripData.bags.map(bag => 
      bag.id === bagId ? { ...bag, [field]: value } : bag
    ));
  }, [tripData.bags, updateTripData]);

  const totalBagWeight = useMemo(() => 
    tripData.bags.reduce((sum, bag) => sum + (bag.weight || 0), 0),
    [tripData.bags]
  );

  const weightDifference = tripData.weightAtCompany - totalBagWeight;

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center mb-6">
        <div className="bg-purple-600 p-3 rounded-full mr-4">
          <Package className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-white">บรรจุใส่เป้ (Big Bag) และติด Tag</h3>
          <p className="text-gray-400">จัดเก็บสินค้าลงเป้และติดป้ายกำกับ</p>
        </div>
      </div>

      {/* Weight Summary */}
      <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-400 text-sm">น้ำหนักที่บริษัท</p>
            <p className="text-2xl text-blue-400 font-bold">{tripData.weightAtCompany.toLocaleString()} กก.</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">น้ำหนักในเป้รวม</p>
            <p className="text-2xl text-green-400 font-bold">{totalBagWeight.toLocaleString()} กก.</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">คงเหลือ</p>
            <p className={`text-2xl font-bold ${
              weightDifference > 0 ? 'text-yellow-400' : weightDifference < 0 ? 'text-red-400' : 'text-green-400'
            }`}>
              {weightDifference.toLocaleString()} กก.
            </p>
          </div>
        </div>
        
        {weightDifference !== 0 && (
          <div className={`mt-3 p-3 rounded text-sm border-l-4 ${
            weightDifference > 0 
              ? 'border-yellow-400 bg-yellow-900/30 text-yellow-300' 
              : 'border-red-400 bg-red-900/30 text-red-300'
          }`}>
            {weightDifference > 0 
              ? `⚠️ ยังมีน้ำหนักที่ยังไม่ได้บรรจุ ${weightDifference.toLocaleString()} กก.`
              : `❌ น้ำหนักในเป้เกินกว่าน้ำหนักที่ชั่ง ${Math.abs(weightDifference).toLocaleString()} กก.`
            }
          </div>
        )}
      </div>

      {/* Add Bag Button */}
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg text-white font-semibold">รายการเป้ ({tripData.bags.length} เป้)</h4>
        <button 
          onClick={addBag}
          className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          <Plus className="mr-2" size={18} />
          เพิ่มเป้ใหม่
        </button>
      </div>
      
      {/* Bags List */}
      {tripData.bags.length === 0 ? (
        <div className="text-center py-12 bg-gray-700 rounded-lg border border-gray-600">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-400 text-lg mb-2">ยังไม่มีรายการเป้</p>
          <p className="text-gray-500 text-sm">คลิก &ldquo;เพิ่มเป้ใหม่&rdquo; เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {tripData.bags.map((bag, index) => (
            <div key={bag.id} className="bg-gray-700 p-5 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-white font-medium text-lg flex items-center">
                  <Package className="mr-2" size={20} />
                  เป้ที่ {index + 1}
                </h5>
                <button 
                  onClick={() => removeBag(bag.id)}
                  className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-900/30 transition-colors"
                  title="ลบเป้นี้"
                >
                  <Minus size={18} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    น้ำหนัก (กก.) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={bag.weight || ''}
                      onChange={(e) => updateBag(bag.id, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none transition-colors pr-12"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                      กก.
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    หมายเลข Tag <span className="text-red-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={bag.tagNumber}
                    onChange={(e) => updateBag(bag.id, 'tagNumber', e.target.value)}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder={`BAG${String(index + 1).padStart(3, '0')}`}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    หมายเหตุ
                  </label>
                  <input 
                    type="text" 
                    value={bag.notes}
                    onChange={(e) => updateBag(bag.id, 'notes', e.target.value)}
                    className="w-full p-3 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="หมายเหตุเพิ่มเติม"
                  />
                </div>
              </div>
              
              {/* Bag Status Indicator */}
              <div className="mt-3 flex justify-between items-center">
                <div className="flex items-center text-sm">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    bag.weight > 0 && bag.tagNumber.trim() ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className={bag.weight > 0 && bag.tagNumber.trim() ? 'text-green-300' : 'text-red-300'}>
                    {bag.weight > 0 && bag.tagNumber.trim() ? 'ข้อมูลครบถ้วน' : 'ข้อมูลไม่ครบ'}
                  </span>
                </div>
                {bag.weight > 0 && (
                  <span className="text-gray-400 text-sm">
                    {((bag.weight / totalBagWeight) * 100).toFixed(1)}% ของน้ำหนักรวม
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {tripData.bags.length > 0 && (
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 mb-6">
          <h5 className="text-white font-medium mb-3">สรุปรวม</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-sm">จำนวนเป้</p>
              <p className="text-xl text-white font-semibold">{tripData.bags.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">น้ำหนักรวม</p>
              <p className="text-xl text-white font-semibold">{totalBagWeight.toLocaleString()} กก.</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">เป้ที่กรอกครบ</p>
              <p className="text-xl text-green-400 font-semibold">
                {tripData.bags.filter(bag => bag.weight > 0 && bag.tagNumber.trim()).length}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">น้ำหนักเฉลี่ย</p>
              <p className="text-xl text-white font-semibold">
                {tripData.bags.length > 0 ? (totalBagWeight / tripData.bags.length).toFixed(1) : '0'} กก.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Validation Alert */}
      {!isValid && (
        <div className="mt-6 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="mr-2 flex-shrink-0" size={20} />
          <span>กรุณาเพิ่มเป้อย่างน้อย 1 เป้ และกรอกข้อมูลให้ครบถ้วน</span>
        </div>
      )}
      
      <div className="flex justify-between mt-8">
        <button 
          onClick={onPrev}
          className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          <ArrowLeft className="mr-2" size={20} />
          ย้อนกลับ
        </button>
        <button 
          onClick={onComplete}
          disabled={!isValid}
          className="flex items-center bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
        >
          <Save className="mr-2" size={20} />
          บันทึกและเสร็จสิ้น
        </button>
      </div>
    </div>
  );
};

// Main NewTrip Component
export default function NewTrip() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tripData, setTripData] = useState<TripFormData>({
    vehicleId: '',
    clientCompany: '',
    itemsList: '',
    weightAtClient: 0,
    weightAtCompany: 0,
    clientPhotos: [],
    companyPhotos: [],
    notes: '',
    bags: []
  });

  const updateTripData = useCallback(<K extends keyof TripFormData>(
    field: K, 
    value: TripFormData[K]
  ) => {
    setTripData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Validation logic for each step
  const stepValidation = useMemo(() => ({
    1: !!(tripData.vehicleId && tripData.clientCompany.trim() && tripData.itemsList.trim()),
    2: tripData.weightAtClient > 0,
    3: tripData.weightAtCompany > 0,
    4: tripData.bags.length > 0 && tripData.bags.every(bag => bag.weight > 0 && bag.tagNumber.trim())
  }), [tripData]);

  const handleNext = useCallback(() => {
    if (stepValidation[currentStep as keyof typeof stepValidation]) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  }, [currentStep, stepValidation]);

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleComplete = useCallback(async () => {
    if (!stepValidation[4]) return;

    // Show loading state
    const confirmResult = window.confirm(
      'ต้องการบันทึกข้อมูลการเดินทางนี้ใช่หรือไม่?\n\nข้อมูลจะถูกบันทึกถาวรและไม่สามารถแก้ไขได้'
    );

    if (!confirmResult) return;

    try {
      // TODO: Save to Supabase database
      console.log('Saving trip data:', tripData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('✅ บันทึกข้อมูลเรียบร้อยแล้ว!\n\nกำลังกลับสู่หน้าหลัก...');
      
      // Reset form
      setTripData({
        vehicleId: '',
        clientCompany: '',
        itemsList: '',
        weightAtClient: 0,
        weightAtCompany: 0,
        clientPhotos: [],
        companyPhotos: [],
        notes: '',
        bags: []
      });
      setCurrentStep(1);
      
      // Navigate back to dashboard (if navigation function is available)
      // setCurrentView('dashboard');
      
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล\nกรุณาลองใหม่อีกครั้ง');
    }
  }, [tripData, stepValidation]);

  const commonProps = {
    tripData,
    updateTripData,
    onNext: handleNext,
    onPrev: handlePrev,
    isValid: Boolean(stepValidation[currentStep as keyof typeof stepValidation])
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">เริ่มงานใหม่</h2>
          <p className="text-gray-400 mt-2">บันทึกการเดินทางรับสินค้ารีไซเคิล</p>
        </div>
        <div className="text-right text-sm text-gray-400">
          <p>ขั้นตอนที่ <span className="text-white font-semibold">{currentStep}</span> จาก 4</p>
          <p>วันที่: {new Date().toLocaleDateString('th-TH')}</p>
        </div>
      </div>
      
      <ProgressBar currentStep={currentStep} />
      
      {/* Step Content */}
      <div className="min-h-[600px]">
        {currentStep === 1 && <Step1 {...commonProps} />}
        {currentStep === 2 && <Step2 {...commonProps} />}
        {currentStep === 3 && <Step3 {...commonProps} />}
        {currentStep === 4 && <Step4 {...commonProps} onComplete={handleComplete} />}
      </div>
      
      {/* Debug Info (Remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <details>
            <summary className="text-gray-400 cursor-pointer text-sm">Debug Info (Development Only)</summary>
            <pre className="text-xs text-gray-500 mt-2 overflow-auto">
              {JSON.stringify({ currentStep, validation: stepValidation, tripData }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}