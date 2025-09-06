// app/components/ui/Sidebar.tsx
"use client"

import React from 'react';
import { 
  Package, 
  Home,
  Truck,
  FileText,
  Users,
  User,
  LogOut,
  Archive,
  Layers
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
  { id: 'material-lots', label: 'รายการวัสดุ', icon: Layers },
  { id: 'bag-management', label: 'จัดการเป้', icon: Archive },
  { id: 'vehicles', label: 'จัดการรถ', icon: Truck },
  { id: 'reports', label: 'รายงาน', icon: FileText },
  { id: 'users', label: 'จัดการผู้ใช้', icon: Users }
];

export default function Sidebar({ currentView, setCurrentView, user, onLogout }: SidebarProps) {
  return (
    <div className="bg-gray-900 w-56 min-h-screen border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center px-4 py-3 border-b border-gray-800">
        <Package className="text-green-500 mr-2" size={20} />
        <h1 className="text-sm font-semibold text-white">TSR-RecycleSystem</h1>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {menuItems.map(item => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isActive 
                  ? 'bg-gray-800 text-white border border-gray-700' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <IconComponent className="mr-2 flex-shrink-0" size={14} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      {/* User Info & Logout */}
      <div className="border-t border-gray-800 p-2">
        <div className="flex items-center px-3 py-2 mb-1">
          <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
            <User size={12} className="text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md transition-colors"
        >
          <LogOut className="mr-2 flex-shrink-0" size={14} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );
}