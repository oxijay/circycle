// components/vehicles/VehicleManagement.tsx
"use client"

import React, { useState, useCallback } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AddVehicleModal from './AddVehicleModal';

interface Vehicle {
  id: number;
  plate: string;
  driver: string;
  status: 'available' | 'in_use' | 'maintenance';
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 1, plate: 'กข-1234', driver: 'สมชาย ใจดี', status: 'available' },
    { id: 2, plate: 'กค-5678', driver: 'สมหญิง รักงาน', status: 'in_use' }
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddVehicle = useCallback(async (newVehicle: Omit<Vehicle, 'id'>) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const vehicleWithId: Vehicle = {
      ...newVehicle,
      id: Math.max(...vehicles.map(v => v.id), 0) + 1
    };
    
    setVehicles(prev => [...prev, vehicleWithId]);
  }, [vehicles]);

  const handleDeleteVehicle = useCallback(async (vehicleId: number) => {
    if (!window.confirm('ต้องการลบรถคันนี้ใช่หรือไม่?')) {
      return;
    }

    // ตรวจสอบว่ารถกำลังใช้งานอยู่หรือไม่
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle?.status === 'in_use') {
      alert('ไม่สามารถลบรถที่กำลังใช้งานอยู่');
      return;
    }

    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
  }, [vehicles]);

  const getStatusDisplay = (status: Vehicle['status']) => {
    const statusMap = {
      'available': { text: 'พร้อมใช้งาน', color: 'bg-green-600' },
      'in_use': { text: 'กำลังใช้งาน', color: 'bg-yellow-600' },
      'maintenance': { text: 'ซ่อมบำรุง', color: 'bg-red-600' }
    };
    
    return statusMap[status];
  };

  const existingPlates = vehicles.map(v => v.plate);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">จัดการรถ</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          <Plus className="mr-2" size={20} />
          เพิ่มรถใหม่
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">รถทั้งหมด</h3>
          <p className="text-2xl font-bold text-white">{vehicles.length}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">พร้อมใช้งาน</h3>
          <p className="text-2xl font-bold text-green-400">
            {vehicles.filter(v => v.status === 'available').length}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-gray-400 text-sm">กำลังใช้งาน</h3>
          <p className="text-2xl font-bold text-yellow-400">
            {vehicles.filter(v => v.status === 'in_use').length}
          </p>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-gray-400 p-3">ทะเบียนรถ</th>
                <th className="text-gray-400 p-3">คนขับ</th>
                <th className="text-gray-400 p-3">สถานะ</th>
                <th className="text-gray-400 p-3">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(vehicle => {
                const statusInfo = getStatusDisplay(vehicle.status);
                return (
                  <tr key={vehicle.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="text-white p-3 font-medium">{vehicle.plate}</td>
                    <td className="text-white p-3">{vehicle.driver}</td>
                    <td className="p-3">
                      <span className={`${statusInfo.color} text-white px-2 py-1 rounded text-xs`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-gray-600"
                          title="แก้ไข"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-600"
                          title="ลบ"
                          disabled={vehicle.status === 'in_use'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {vehicles.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              ไม่มีข้อมูลรถ
            </div>
          )}
        </div>
      </div>

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddVehicle}
        existingPlates={existingPlates}
      />
    </div>
  );
}