// components/vehicles/AddVehicleModal.tsx
"use client"

import React, { useState, useCallback } from 'react';

interface Vehicle {
  plate: string;
  driver: string;
  status: 'available' | 'in_use' | 'maintenance';
}

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (vehicle: Vehicle) => Promise<void>;
  existingPlates: string[];
}

export default function AddVehicleModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  existingPlates 
}: AddVehicleModalProps) {
  const [formData, setFormData] = useState<Vehicle>({
    plate: '',
    driver: '',
    status: 'available'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Vehicle>>({});

  // ใช้ useCallback เพื่อป้องกัน re-render ที่ไม่จำเป็น
  const handleInputChange = useCallback((field: keyof Vehicle, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const validateForm = useCallback(() => {
    const newErrors: Partial<Vehicle> = {};
    
    if (!formData.plate.trim()) {
      newErrors.plate = 'กรุณากรอกทะเบียนรถ';
    } else if (existingPlates.includes(formData.plate.trim())) {
      newErrors.plate = 'ทะเบียนรถนี้มีอยู่แล้ว';
    }
    
    if (!formData.driver.trim()) {
      newErrors.driver = 'กรุณากรอกชื่อคนขับ';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, existingPlates]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onAdd({
        plate: formData.plate.trim(),
        driver: formData.driver.trim(),
        status: formData.status
      });
      
      // Reset form
      setFormData({ plate: '', driver: '', status: 'available' });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มรถ');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onAdd, onClose]);

  const handleClose = useCallback(() => {
    setFormData({ plate: '', driver: '', status: 'available' });
    setErrors({});
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">เพิ่มรถใหม่</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl"
            type="button"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              ทะเบียนรถ *
            </label>
            <input
              type="text"
              value={formData.plate}
              onChange={(e) => handleInputChange('plate', e.target.value)}
              className={`w-full p-3 bg-gray-700 text-white rounded-lg border focus:outline-none transition-colors ${
                errors.plate 
                  ? 'border-red-500 focus:border-red-400' 
                  : 'border-gray-600 focus:border-blue-500'
              }`}
              placeholder="เช่น กข-1234"
              disabled={isSubmitting}
            />
            {errors.plate && (
              <p className="text-red-400 text-xs mt-1">{errors.plate}</p>
            )}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              ชื่อคนขับ *
            </label>
            <input
              type="text"
              value={formData.driver}
              onChange={(e) => handleInputChange('driver', e.target.value)}
              className={`w-full p-3 bg-gray-700 text-white rounded-lg border focus:outline-none transition-colors ${
                errors.driver 
                  ? 'border-red-500 focus:border-red-400' 
                  : 'border-gray-600 focus:border-blue-500'
              }`}
              placeholder="ชื่อ-นามสกุล"
              disabled={isSubmitting}
            />
            {errors.driver && (
              <p className="text-red-400 text-xs mt-1">{errors.driver}</p>
            )}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              สถานะ
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              disabled={isSubmitting}
            >
              <option value="available">พร้อมใช้งาน</option>
              <option value="maintenance">ซ่อมบำรุง</option>
            </select>
          </div>
          
          <div className="flex space-x-4 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition duration-200"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่มรถ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}