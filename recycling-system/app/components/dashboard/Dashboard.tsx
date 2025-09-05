// components/dashboard/Dashboard.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { Truck, Scale } from 'lucide-react';

interface Trip {
  id: number;
  date: string;
  vehicle: string;
  client: string;
  status: string;
  totalWeight: number;
  weightDiff: number;
}

interface DashboardStats {
  todayTrips: number;
  todayWeight: number;
  availableVehicles: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayTrips: 5,
    todayWeight: 2450,
    availableVehicles: 3
  });

  const [trips, setTrips] = useState<Trip[]>([
    {
      id: 1,
      date: '2025-08-30',
      vehicle: 'กข-1234',
      client: 'โรงงาน ABC',
      status: 'completed',
      totalWeight: 1500,
      weightDiff: -50
    },
    {
      id: 2,
      date: '2025-08-30',
      vehicle: 'กค-5678',
      client: 'โรงงาน XYZ',
      status: 'completed',
      totalWeight: 950,
      weightDiff: -25
    }
  ]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'bg-green-600',
      'in_progress': 'bg-yellow-600',
      'cancelled': 'bg-red-600'
    };
    return statusMap[status] || 'bg-gray-600';
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'เสร็จสิ้น',
      'in_progress': 'กำลังดำเนินการ',
      'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">หน้าหลัก</h2>
        <div className="text-gray-400 text-sm">
          วันที่: {new Date().toLocaleDateString('th-TH')}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">เที่ยวทั้งหมดวันนี้</p>
              <p className="text-3xl font-bold text-white">{stats.todayTrips}</p>
              <p className="text-green-400 text-xs">+2 จากเมื่อวาน</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-full">
              <Truck className="text-blue-400" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-green-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">น้ำหนักรวมวันนี้</p>
              <p className="text-3xl font-bold text-white">{stats.todayWeight.toLocaleString()}</p>
              <p className="text-gray-400 text-xs">กิโลกรัม</p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-full">
              <Scale className="text-green-400" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-yellow-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">รถที่พร้อมใช้งาน</p>
              <p className="text-3xl font-bold text-white">{stats.availableVehicles}</p>
              <p className="text-yellow-400 text-xs">จาก 5 คันทั้งหมด</p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-full">
              <Truck className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips Table */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">เที่ยวล่าสุด</h3>
          <button className="text-blue-400 hover:text-blue-300 text-sm">
            ดูทั้งหมด →
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-gray-400 p-3 text-sm font-medium">วันที่</th>
                <th className="text-gray-400 p-3 text-sm font-medium">รถ</th>
                <th className="text-gray-400 p-3 text-sm font-medium">ลูกค้า</th>
                <th className="text-gray-400 p-3 text-sm font-medium">น้ำหนัก (กก.)</th>
                <th className="text-gray-400 p-3 text-sm font-medium">ส่วนต่าง</th>
                <th className="text-gray-400 p-3 text-sm font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => (
                <tr key={trip.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                  <td className="text-white p-3">{trip.date}</td>
                  <td className="text-white p-3 font-medium">{trip.vehicle}</td>
                  <td className="text-white p-3">{trip.client}</td>
                  <td className="text-white p-3">{trip.totalWeight.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`${trip.weightDiff < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {trip.weightDiff > 0 ? '+' : ''}{trip.weightDiff}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`${getStatusColor(trip.status)} text-white px-2 py-1 rounded text-xs`}>
                      {getStatusText(trip.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {trips.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              ไม่มีข้อมูลเที่ยวในวันนี้
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">การแจ้งเตือน</h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
              <span className="text-gray-300">รถ กง-9012 ต้องเข้าซ่อมบำรุง</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              <span className="text-gray-300">มีเที่ยวใหม่ 3 เที่ยวรอดำเนินการ</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">สถิติสัปดาห์นี้</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">เที่ยวทั้งหมด:</span>
              <span className="text-white">35 เที่ยว</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">น้ำหนักเฉลี่ย:</span>
              <span className="text-white">1,250 กก.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}