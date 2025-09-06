// app/page.tsx
"use client"

import React, { useState } from 'react';
import Sidebar from './components/ui/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import VehicleManagement from './components/vehicles/VehicleManagement';
import NewTrip from './components/trips/NewTrip';
import Reports from './components/dashboard/Reports';
import UserManagement from './components/auth/UserManagement';
import LoginForm from './components/auth/LoginForm';
import BagManagement from './components/bags/BagManagement';
import MaterialLots from './components/materialLots/MaterialLots';  // เพิ่มบรรทัดนี้

export default function HomePage() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user] = useState({ name: 'John Doe', role: 'admin' });

  if (!isLoggedIn) {
    return <LoginForm onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        user={user}
        onLogout={() => setIsLoggedIn(false)}
      />
      
      <div className="flex-1">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'new-trip' && <NewTrip />}
        {currentView === 'material-lots' && <MaterialLots />}  {/* เพิ่มบรรทัดนี้ */}
        {currentView === 'bag-management' && <BagManagement />}
        {currentView === 'vehicles' && <VehicleManagement />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'users' && <UserManagement />}
      </div>
    </div>
  );
}