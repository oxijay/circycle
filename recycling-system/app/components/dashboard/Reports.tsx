// components/dashboard/Reports.tsx
"use client"

import React, { useState } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown, FileText, BarChart3 } from 'lucide-react';

interface ReportData {
  period: string;
  totalTrips: number;
  totalWeight: number;
  avgWeightDiff: number;
  completedTrips: number;
}

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);

  const reportData: ReportData = {
    period: 'เดือนนี้',
    totalTrips: 125,
    totalWeight: 45250,
    avgWeightDiff: -1.2,
    completedTrips: 120
  };

  const monthlyData = [
    { month: 'ม.ค.', trips: 98, weight: 35200 },
    { month: 'ก.พ.', trips: 112, weight: 38900 },
    { month: 'มี.ค.', trips: 125, weight: 45250 },
    { month: 'เม.ย.', trips: 118, weight: 42100 },
    { month: 'พ.ค.', trips: 134, weight: 48300 }
  ];

  const topClients = [
    { name: 'โรงงาน ABC จำกัด', trips: 15, weight: 5400 },
    { name: 'บริษัท XYZ อุตสาหกรรม', trips: 12, weight: 4200 },
    { name: 'โรงงาน DEF', trips: 10, weight: 3800 },
    { name: 'บริษัท GHI รีไซเคิล', trips: 8, weight: 2900 }
  ];

  const handleDownloadReport = async (type: string) => {
    setIsGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      alert(`กำลังดาวน์โหลดรายงาน${type}...`);
    }, 2000);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">รายงาน</h2>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
            <option value="quarter">ไตรมาสนี้</option>
            <option value="year">ปีนี้</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">เที่ยวรวม{reportData.period}</p>
              <p className="text-3xl font-bold text-white">{reportData.totalTrips}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="text-green-400 mr-1" size={16} />
                <span className="text-green-400 text-sm">+12% จากเดือนก่อน</span>
              </div>
            </div>
            <BarChart3 className="text-blue-400" size={40} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">น้ำหนักรวม (กก.)</p>
              <p className="text-3xl font-bold text-white">{reportData.totalWeight.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="text-green-400 mr-1" size={16} />
                <span className="text-green-400 text-sm">+8% จากเดือนก่อน</span>
              </div>
            </div>
            <TrendingUp className="text-green-400" size={40} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">ส่วนต่างเฉลี่ย (%)</p>
              <p className="text-3xl font-bold text-red-400">{reportData.avgWeightDiff}%</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="text-red-400 mr-1" size={16} />
                <span className="text-red-400 text-sm">-0.3% จากเดือนก่อน</span>
              </div>
            </div>
            <TrendingDown className="text-red-400" size={40} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">อัตราสำเร็จ (%)</p>
              <p className="text-3xl font-bold text-green-400">
                {Math.round((reportData.completedTrips / reportData.totalTrips) * 100)}%
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="text-green-400 mr-1" size={16} />
                <span className="text-green-400 text-sm">+5% จากเดือนก่อน</span>
              </div>
            </div>
            <Calendar className="text-green-400" size={40} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend Chart */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">แนวโน้มรายเดือน</h3>
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-300 w-12">{data.month}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(data.trips / 140) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">{data.trips} เที่ยว</div>
                  <div className="text-gray-400 text-xs">{data.weight.toLocaleString()} กก.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">ลูกค้าอันดับต้น</h3>
          <div className="space-y-4">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{client.name}</p>
                    <p className="text-gray-400 text-xs">{client.trips} เที่ยว</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{client.weight.toLocaleString()}</p>
                  <p className="text-gray-400 text-xs">กิโลกรัม</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Download Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-4">
            <FileText className="text-blue-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold text-white">รายงานสรุป</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            รายงานสรุปผลการดำเนินงานรายเดือน รวมสถิติต่างๆ
          </p>
          <button 
            onClick={() => handleDownloadReport('สรุป')}
            disabled={isGenerating}
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition duration-200"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังสร้าง...
              </>
            ) : (
              <>
                <Download className="mr-2" size={18} />
                ดาวน์โหลด PDF
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-4">
            <BarChart3 className="text-green-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold text-white">รายงานรายละเอียด</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            รายงานรายละเอียดทุกเที่ยว พร้อมข้อมูลน้ำหนักและภาพ
          </p>
          <button 
            onClick={() => handleDownloadReport('รายละเอียด')}
            disabled={isGenerating}
            className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition duration-200"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังสร้าง...
              </>
            ) : (
              <>
                <Download className="mr-2" size={18} />
                ดาวน์โหลด Excel
              </>
            )}
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center mb-4">
            <TrendingUp className="text-purple-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold text-white">รายงานการวิเคราะห์</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            วิเคราะห์แนวโน้ม ประสิทธิภาพ และข้อเสนอแนะ
          </p>
          <button 
            onClick={() => handleDownloadReport('การวิเคราะห์')}
            disabled={isGenerating}
            className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition duration-200"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังสร้าง...
              </>
            ) : (
              <>
                <Download className="mr-2" size={18} />
                ดาวน์โหลด PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}