'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Truck, Scale, Package, MapPin, RefreshCw, Trash2 } from 'lucide-react';

// Types based on Supabase schema
interface Bag {
  id: string;
  bag_code: string;
  weight: number;
  material: string | null;
  trip_id: string;
  created_at: string;
  updated_at: string;
}

interface Trip {
  id: string;
  vehicle_id: string;
  customer_factory: string;
  departure_time: string;
  arrival_time: string | null;
  return_time: string | null;
  initial_weight: number;
  final_weight: number;
  weight_difference: number;
  status: TripStatus;
  created_at: string;
  updated_at: string;
  bags?: Bag[];
}

type TripStatus = 
  | 'PENDING'           // รออกรถ
  | 'TRAVELING'         // เดินทางไปโรงงาน
  | 'ARRIVED'           // ถึงโรงงานแล้ว
  | 'WEIGHING_INITIAL'  // ชั่งน้ำหนักเริ่มต้น
  | 'WEIGHING_FINAL'    // ชั่งน้ำหนักสุดท้าย
  | 'PACKING'           // บรรจุใส่เป้
  | 'COMPLETED'         // เสร็จสิ้น

const STATUS_LABELS: Record<TripStatus, string> = {
  'PENDING': 'รออกรถ',
  'TRAVELING': 'เดินทางไปโรงงาน',
  'ARRIVED': 'ถึงโรงงานแล้ว',
  'WEIGHING_INITIAL': 'ชั่งน้ำหนักเริ่มต้น',
  'WEIGHING_FINAL': 'ชั่งน้ำหนักสุดท้าย',
  'PACKING': 'บรรจุใส่เป้',
  'COMPLETED': 'เสร็จสิ้น'
};

const RecyclingManagementSystem: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const steps = [
    { id: 1, title: 'รถออกจากบริษัท', icon: Truck },
    { id: 2, title: 'ถึงโรงงานลูกค้า', icon: MapPin },
    { id: 3, title: 'ขนของและชั่งน้ำหนัก', icon: Scale },
    { id: 4, title: 'กลับบริษัทและชั่งอีกครั้ง', icon: Scale },
    { id: 5, title: 'บรรจุใส่เป้และติดแท็ก', icon: Package }
  ];

  // Load trips on component mount
  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trips');
      if (!response.ok) throw new Error('Failed to load trips');
      const data = await response.json();
      setTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
      setError('ไม่สามารถโหลดข้อมูลการเดินทางได้');
    } finally {
      setLoading(false);
    }
  };

  const createNewTrip = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: '',
          customerFactory: ''
        }),
      });

      if (!response.ok) throw new Error('Failed to create trip');
      
      const newTrip = await response.json();
      setCurrentTrip({ ...newTrip, bags: [] });
      setCurrentStep(1);
    } catch (error) {
      console.error('Error creating trip:', error);
      setError('ไม่สามารถสร้างเที่ยวใหม่ได้');
    } finally {
      setLoading(false);
    }
  };

  const updateTrip = async (updates: Partial<Trip>) => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/trips/${currentTrip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update trip');
      
      const updatedTrip = await response.json();
      setCurrentTrip(updatedTrip);
    } catch (error) {
      console.error('Error updating trip:', error);
      setError('ไม่สามารถอัพเดทข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (!currentTrip || currentStep > 5) return;

    let updates: Partial<Trip> = {};
    let newStatus: TripStatus = currentTrip.status;

    switch (currentStep) {
      case 1:
        newStatus = 'TRAVELING';
        break;
      case 2:
        newStatus = 'ARRIVED';
        updates.arrival_time = new Date().toISOString();
        break;
      case 3:
        newStatus = 'WEIGHING_FINAL';
        break;
      case 4:
        newStatus = 'PACKING';
        updates.return_time = new Date().toISOString();
        break;
      case 5:
        newStatus = 'COMPLETED';
        await loadTrips();
        break;
    }

    updates.status = newStatus;
    await updateTrip(updates);
    setCurrentStep(currentStep + 1);
  };

  const updateTripField = (field: keyof Trip, value: string | number) => {
    if (!currentTrip) return;

    setCurrentTrip({
      ...currentTrip,
      [field]: value
    });
  };

  const saveTripData = async () => {
    if (!currentTrip) return;
    
    try {
      setLoading(true);
      await updateTrip({
        vehicle_id: currentTrip.vehicle_id,
        customer_factory: currentTrip.customer_factory,
        initial_weight: currentTrip.initial_weight,
        final_weight: currentTrip.final_weight
      });
    } catch (error) {
      console.error('Error saving trip:', error);
      setError('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const addBag = async () => {
    if (!currentTrip) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/bags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: 0,
          material: '',
          tripId: currentTrip.id
        }),
      });

      if (!response.ok) throw new Error('Failed to create bag');
      
      const newBag = await response.json();
      setCurrentTrip({
        ...currentTrip,
        bags: [...(currentTrip.bags || []), newBag]
      });
    } catch (error) {
      console.error('Error creating bag:', error);
      setError('ไม่สามารถเพิ่มเป้ได้');
    } finally {
      setLoading(false);
    }
  };

  const updateBag = (bagId: string, field: 'weight' | 'material', value: string | number) => {
    if (!currentTrip) return;

    setCurrentTrip({
      ...currentTrip,
      bags: currentTrip.bags?.map(bag => 
        bag.id === bagId ? { ...bag, [field]: value } : bag
      ) || []
    });
  };

  const saveBagData = async (bagId: string, data: { weight?: number; material?: string }) => {
    try {
      const response = await fetch(`/api/bags/${bagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update bag');
    } catch (error) {
      console.error('Error updating bag:', error);
      setError('ไม่สามารถอัพเดทข้อมูลเป้ได้');
    }
  };

  const deleteBag = async (bagId: string) => {
    if (!currentTrip) return;

    try {
      const response = await fetch(`/api/bags/${bagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bag');
      
      setCurrentTrip({
        ...currentTrip,
        bags: currentTrip.bags?.filter(bag => bag.id !== bagId) || []
      });
    } catch (error) {
      console.error('Error deleting bag:', error);
      setError('ไม่สามารถลบเป้ได้');
    }
  };

  const resetTrip = () => {
    setCurrentTrip(null);
    setCurrentStep(1);
    setError('');
  };

  const getStepColor = (stepId: number): string => {
    if (stepId < currentStep) return 'step-completed';
    if (stepId === currentStep) return 'step-current';
    return 'step-pending';
  };

  const isNextStepDisabled = (): boolean => {
    if (loading) return true;
    if (currentStep === 3 && currentTrip?.initial_weight === 0) return true;
    if (currentStep === 4 && currentTrip?.final_weight === 0) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container">
        <div className="py-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-400">
              ระบบจัดการกระบวนการรีไซเคิล
            </h1>
            <button
              onClick={loadTrips}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'spin' : ''}`} />
              รีเฟรช
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message mb-6">
              {error}
            </div>
          )}

          {/* Trip Creation */}
          {!currentTrip && (
            <div className="card mb-6 text-center">
              <h2 className="text-xl font-semibold mb-4">เริ่มการเดินทางใหม่</h2>
              <button
                onClick={createNewTrip}
                disabled={loading}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                {loading ? 'กำลังสร้าง...' : 'สร้างเที่ยวใหม่'}
              </button>
            </div>
          )}

          {/* Current Trip */}
          {currentTrip && (
            <div className="space-y-6">
              {/* Trip Info */}
              <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label">รหัสเที่ยว</label>
                    <div className="form-display trip-id">
                      {currentTrip.id.slice(-8).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">รหัสรถ</label>
                    <input
                      type="text"
                      value={currentTrip.vehicle_id}
                      onChange={(e) => updateTripField('vehicle_id', e.target.value)}
                      onBlur={saveTripData}
                      className="form-input"
                      placeholder="กรอกรหัสรถ"
                    />
                  </div>
                  <div>
                    <label className="form-label">โรงงานลูกค้า</label>
                    <input
                      type="text"
                      value={currentTrip.customer_factory}
                      onChange={(e) => updateTripField('customer_factory', e.target.value)}
                      onBlur={saveTripData}
                      className="form-input"
                      placeholder="ชื่อโรงงาน"
                    />
                  </div>
                  <div>
                    <label className="form-label">สถานะ</label>
                    <div className="status-badge">
                      {STATUS_LABELS[currentTrip.status]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">ขั้นตอนการดำเนินงาน</h3>
                <div className="steps-container mb-6">
                  {steps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.id}
                        className={`step-item ${getStepColor(step.id)}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{step.title}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Step-specific inputs */}
                {currentStep === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="form-label">น้ำหนักเริ่มต้น (กก.)</label>
                      <input
                        type="number"
                        value={currentTrip.initial_weight}
                        onChange={(e) => updateTripField('initial_weight', parseFloat(e.target.value) || 0)}
                        onBlur={saveTripData}
                        className="form-input"
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="form-label">น้ำหนักเริ่มต้น (กก.)</label>
                      <div className="form-display">{currentTrip.initial_weight}</div>
                    </div>
                    <div>
                      <label className="form-label">น้ำหนักสุดท้าย (กก.)</label>
                      <input
                        type="number"
                        value={currentTrip.final_weight}
                        onChange={(e) => updateTripField('final_weight', parseFloat(e.target.value) || 0)}
                        onBlur={saveTripData}
                        className="form-input"
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="form-label">ส่วนต่างน้ำหนัก (กก.)</label>
                      <div className="form-display weight-diff">
                        {(currentTrip.final_weight - currentTrip.initial_weight).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-medium">การบรรจุเป้</h4>
                      <button
                        onClick={addBag}
                        disabled={loading}
                        className="btn-success flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        เพิ่มเป้
                      </button>
                    </div>
                    
                    {currentTrip.bags?.map((bag) => (
                      <div key={bag.id} className="bag-item">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <label className="form-label">รหัสเป้</label>
                            <div className="bag-code">{bag.bag_code}</div>
                          </div>
                          <div>
                            <label className="form-label">น้ำหนัก (กก.)</label>
                            <input
                              type="number"
                              value={bag.weight}
                              onChange={(e) => updateBag(bag.id, 'weight', parseFloat(e.target.value) || 0)}
                              onBlur={() => saveBagData(bag.id, { weight: bag.weight })}
                              className="bag-input"
                              placeholder="0"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="form-label">ประเภทวัสดุ</label>
                            <input
                              type="text"
                              value={bag.material || ''}
                              onChange={(e) => updateBag(bag.id, 'material', e.target.value)}
                              onBlur={() => saveBagData(bag.id, { material: bag.material ?? undefined })}
                              className="bag-input"
                              placeholder="เช่น พลาสติก, โลหะ"
                            />
                          </div>
                          <div>
                            <label className="form-label">วันที่บรรจุ</label>
                            <div className="text-sm text-gray-300">
                              {new Date(bag.created_at).toLocaleString('th-TH')}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => deleteBag(bag.id)}
                              className="btn-danger p-2"
                              title="ลบเป้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentStep <= 5 && (
                  <div className="flex gap-4">
                    <button
                      onClick={nextStep}
                      disabled={isNextStepDisabled()}
                      className="btn-primary"
                    >
                      {loading ? 'กำลังดำเนินการ...' : currentStep === 5 ? 'เสร็จสิ้น' : 'ขั้นตอนถัดไป'}
                    </button>
                    
                    <button
                      onClick={resetTrip}
                      className="btn-secondary"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trip History */}
          {trips.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">ประวัติการเดินทาง</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>รหัสเที่ยว</th>
                      <th>รหัสรถ</th>
                      <th>โรงงาน</th>
                      <th>น้ำหนัก (กก.)</th>
                      <th>จำนวนเป้</th>
                      <th>สถานะ</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip.id}>
                        <td className="trip-id">
                          {trip.id.slice(-8).toUpperCase()}
                        </td>
                        <td>{trip.vehicle_id}</td>
                        <td>{trip.customer_factory}</td>
                        <td className="weight-value">{trip.weight_difference.toFixed(2)}</td>
                        <td>{trip.bags?.length || 0}</td>
                        <td>
                          <span className={`table-status ${trip.status === 'COMPLETED' ? 'completed' : 'pending'}`}>
                            {STATUS_LABELS[trip.status]}
                          </span>
                        </td>
                        <td className="text-gray-400">
                          {new Date(trip.created_at).toLocaleDateString('th-TH')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep > 5 && (
            <div className="text-center">
              <button
                onClick={resetTrip}
                className="btn-primary"
              >
                เริ่มเที่ยวใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecyclingManagementSystem;