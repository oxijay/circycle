// components/auth/UserManagement.tsx
"use client"

import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Shield, User, Settings } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (user: Omit<User, 'id' | 'lastLogin' | 'createdAt'>) => Promise<void>;
}

function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as User['role'],
    status: 'active' as User['status']
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'กรุณากรอกชื่อ';
    if (!formData.email.trim()) newErrors.email = 'กรุณากรอกอีเมล';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!formData.password.trim()) newErrors.password = 'กรุณากรอกรหัสผ่าน';
    else if (formData.password.length < 6) newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        status: formData.status
      });
      
      setFormData({ name: '', email: '', password: '', role: 'operator', status: 'active' });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error adding user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">เพิ่มผู้ใช้ใหม่</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            type="button"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              ชื่อ-นามสกุล *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full p-3 bg-gray-700 text-white rounded-lg border focus:outline-none transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
              }`}
              placeholder="กรอกชื่อ-นามสกุล"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              อีเมล *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full p-3 bg-gray-700 text-white rounded-lg border focus:outline-none transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
              }`}
              placeholder="user@company.com"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              รหัสผ่าน *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full p-3 bg-gray-700 text-white rounded-lg border focus:outline-none transition-colors pr-12 ${
                  errors.password ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
                }`}
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              ระดับการเข้าถึง
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="operator">Operator - ใช้งานพื้นฐาน</option>
              <option value="manager">Manager - จัดการข้อมูล</option>
              <option value="admin">Admin - เข้าถึงทุกอย่าง</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              สถานะ
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="active">ใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>
          </div>
          
          <div className="flex space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
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
              {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่มผู้ใช้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@company.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2025-08-30 14:30',
      createdAt: '2025-01-15'
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@company.com',
      role: 'manager',
      status: 'active',
      lastLogin: '2025-08-29 16:45',
      createdAt: '2025-02-20'
    },
    {
      id: 3,
      name: 'Bob Wilson',
      email: 'bob@company.com',
      role: 'operator',
      status: 'active',
      lastLogin: '2025-08-30 09:15',
      createdAt: '2025-03-10'
    },
    {
      id: 4,
      name: 'Alice Brown',
      email: 'alice@company.com',
      role: 'operator',
      status: 'inactive',
      lastLogin: '2025-08-25 11:20',
      createdAt: '2025-04-05'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const getRoleInfo = (role: User['role']) => {
    const roleMap = {
      'admin': { text: 'Admin', color: 'bg-red-600', icon: Shield },
      'manager': { text: 'Manager', color: 'bg-blue-600', icon: Settings },
      'operator': { text: 'Operator', color: 'bg-yellow-600', icon: User }
    };
    return roleMap[role];
  };

  const getStatusInfo = (status: User['status']) => {
    return {
      'active': { text: 'ใช้งาน', color: 'bg-green-600' },
      'inactive': { text: 'ปิดใช้งาน', color: 'bg-gray-600' }
    }[status];
  };

  const handleAddUser = async (newUser: Omit<User, 'id' | 'lastLogin' | 'createdAt'>) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userWithData: User = {
      ...newUser,
      id: Math.max(...users.map(u => u.id)) + 1,
      lastLogin: 'ยังไม่เข้าสู่ระบบ',
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setUsers(prev => [...prev, userWithData]);
  };

  const handleDeleteUser = (userId: number) => {
    if (!window.confirm('ต้องการลบผู้ใช้นี้ใช่หรือไม่?')) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleToggleStatus = (userId: number) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    operators: users.filter(u => u.role === 'operator').length
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">จัดการผู้ใช้</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
        >
          <Plus className="mr-2" size={20} />
          เพิ่มผู้ใช้ใหม่
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm">ทั้งหมด</h3>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm">ใช้งาน</h3>
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm">Admin</h3>
          <p className="text-2xl font-bold text-red-400">{stats.admins}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm">Manager</h3>
          <p className="text-2xl font-bold text-blue-400">{stats.managers}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm">Operator</h3>
          <p className="text-2xl font-bold text-yellow-400">{stats.operators}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">ทุกระดับ</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="operator">Operator</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-gray-400 p-3 text-sm font-medium">ผู้ใช้</th>
                <th className="text-gray-400 p-3 text-sm font-medium">ระดับการเข้าถึง</th>
                <th className="text-gray-400 p-3 text-sm font-medium">สถานะ</th>
                <th className="text-gray-400 p-3 text-sm font-medium">เข้าสู่ระบบล่าสุด</th>
                <th className="text-gray-400 p-3 text-sm font-medium">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const roleInfo = getRoleInfo(user.role);
                const statusInfo = getStatusInfo(user.status);
                const RoleIcon = roleInfo.icon;
                
                return (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <RoleIcon className="mr-2" size={16} />
                        <span className={`${roleInfo.color} text-white px-2 py-1 rounded text-xs`}>
                          {roleInfo.text}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`${statusInfo.color} text-white px-2 py-1 rounded text-xs`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="text-gray-300 p-3 text-sm">
                      {user.lastLogin}
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleToggleStatus(user.id)}
                          className={`p-1 rounded hover:bg-gray-600 ${
                            user.status === 'active' ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                          }`}
                          title={user.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-gray-600"
                          title="แก้ไข"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-600"
                          title="ลบ"
                          disabled={user.role === 'admin' && stats.admins <= 1}
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
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all' 
                ? 'ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข' 
                : 'ไม่มีข้อมูลผู้ใช้'
              }
            </div>
          )}
        </div>
      </div>

      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddUser}
      />
    </div>
  );
}