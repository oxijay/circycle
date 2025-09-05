// components/ui/Sidebar.tsx
"use client"

import React from 'react';
import { 
  Package, 
  Home,
  Truck,
  FileText,
  Users,
  User,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  user: { name: string; role: string };
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'หน้าหลัก', icon: Home },
  { id: 'new-trip', label: 'เริ่มงานใหม่', icon: Truck },
  { id: 'vehicles', label: 'จัดการรถ', icon: Truck },
  { id: 'reports', label: 'รายงาน', icon: FileText },
  { id: 'users', label: 'จัดการผู้ใช้', icon: Users }
];

export default function Sidebar({ currentView, setCurrentView, user, onLogout }: SidebarProps) {
  return (
    <div className="bg-gray-800 w-64 min-h-screen p-4 flex flex-col">
      {/* Logo */}
      <div className="flex items-center mb-8">
        <Package className="text-green-400 mr-2" size={32} />
        <h1 className="text-xl font-bold text-white">ระบบรีไซเคิล</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <IconComponent className="mr-3" size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>
      
      {/* User Info & Logout */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center text-gray-300 mb-4 px-4">
          <User className="mr-2" size={20} />
          <div>
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="mr-3" size={20} />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}