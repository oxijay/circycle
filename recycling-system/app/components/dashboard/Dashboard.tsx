// app/components/dashboard/Dashboard.tsx
"use client"

import React from 'react';
import { 
  Truck, 
  Package, 
  TrendingUp, 
  Calendar,
  Scale,
  Users,
  MapPin,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { 
      title: 'เที่ยวทั้งหมด', 
      value: '324', 
      change: '+12.5%', 
      changeType: 'positive',
      icon: Truck,
      period: 'เดือนนี้'
    },
    { 
      title: 'น้ำหนักรวม', 
      value: '15.2', 
      unit: 'ตัน',
      change: '+8.1%', 
      changeType: 'positive',
      icon: Scale,
      period: 'เดือนนี้'
    },
    { 
      title: 'เป้ทั้งหมด', 
      value: '1,247', 
      change: '+15.3%', 
      changeType: 'positive',
      icon: Package,
      period: 'เดือนนี้'
    },
    { 
      title: 'ลูกค้าใหม่', 
      value: '23', 
      change: '+5.2%', 
      changeType: 'positive',
      icon: Users,
      period: 'เดือนนี้'
    }
  ];

  const recentTrips = [
    { id: 'TRIP001', client: 'โรงงาน ABC จำกัด', weight: '1,200 กก.', status: 'completed', time: '2 ชม. ที่แล้ว' },
    { id: 'TRIP002', client: 'บริษัท XYZ อุตสาหกรรม', weight: '850 กก.', status: 'processing', time: '4 ชม. ที่แล้ว' },
    { id: 'TRIP003', client: 'โรงงาน DEF', weight: '2,100 กก.', status: 'completed', time: '6 ชม. ที่แล้ว' },
    { id: 'TRIP004', client: 'บริษัท GHI รีไซเคิล', weight: '750 กก.', status: 'pending', time: '1 วัน ที่แล้ว' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900/20 border-green-500/20';
      case 'processing': return 'text-blue-400 bg-blue-900/20 border-blue-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสิ้น';
      case 'processing': return 'ดำเนินการ';
      case 'pending': return 'รอดำเนินการ';
      default: return status;
    }
  };

  return (
    <div className="flex-1 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">แดชบอร์ด</h1>
          <p className="text-xs text-gray-400 mt-1">ภาพรวมและข้อมูลสำคัญของระบบ</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-gray-800 rounded-md flex items-center justify-center">
                    <IconComponent className="text-gray-400" size={16} />
                  </div>
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline">
                    <span className="text-xl font-bold text-white">{stat.value}</span>
                    {stat.unit && <span className="text-xs text-gray-400 ml-1">{stat.unit}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{stat.title}</p>
                  <p className="text-xs text-gray-500">{stat.period}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Trips */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">เที่ยวล่าสุด</h3>
                <button className="text-xs text-blue-400 hover:text-blue-300">ดูทั้งหมด</button>
              </div>
            </div>
            <div className="p-0">
              {recentTrips.map((trip, index) => (
                <div key={trip.id} className={`p-4 ${index !== recentTrips.length - 1 ? 'border-b border-gray-800' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="text-xs font-mono text-blue-400">{trip.id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(trip.status)}`}>
                          {getStatusLabel(trip.status)}
                        </span>
                      </div>
                      <p className="text-sm text-white truncate">{trip.client}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-xs text-gray-400">
                          <Scale size={12} className="mr-1" />
                          {trip.weight}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock size={12} className="mr-1" />
                          {trip.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & Stats */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">การดำเนินการด่วน</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors">
                  <Truck size={14} className="mr-2" />
                  เริ่มงานใหม่
                </button>
                <button className="w-full flex items-center justify-center px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-md transition-colors border border-gray-700">
                  <Package size={14} className="mr-2" />
                  จัดการเป้
                </button>
                <button className="w-full flex items-center justify-center px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-md transition-colors border border-gray-700">
                  <BarChart3 size={14} className="mr-2" />
                  ดูรายงาน
                </button>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">กิจกรรมวันนี้</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">เที่ยวที่เสร็จสิ้น</span>
                  <span className="text-xs font-medium text-white">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">เป้ที่สร้างใหม่</span>
                  <span className="text-xs font-medium text-white">45</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">เป้ที่คัดแยกแล้ว</span>
                  <span className="text-xs font-medium text-white">23</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">น้ำหนักรวมวันนี้</span>
                  <span className="text-xs font-medium text-white">2.1 ตัน</span>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">สถานะระบบ</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">รถพร้อมใช้งาน</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs font-medium text-white">8/10</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">พนักงานออนไลน์</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs font-medium text-white">15</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">เที่ยวกำลังดำเนินการ</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    <span className="text-xs font-medium text-white">3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}