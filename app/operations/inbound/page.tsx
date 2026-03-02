'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Trip } from '@/app/operations/trips/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'รออกรถ',
  TRAVELING: 'เดินทางไปโรงงาน',
  ARRIVED: 'ถึงโรงงานแล้ว',
  WEIGHING_INITIAL: 'ชั่งน้ำหนักเริ่มต้น',
  WEIGHING_FINAL: 'ชั่งน้ำหนักสุดท้าย',
  PACKING: 'กำลังจัดลงเป้',
  WEIGHED_EMPTY_OUT: 'ชั่งรถเปล่าก่อนออก',
  DEPARTED_PLANT: 'ออกจากโรงงานเรา',
  ARRIVED_CUSTOMER: 'ถึงโรงงานลูกค้า',
  LOADED_AT_CUSTOMER: 'ขึ้นของเสร็จ',
  DEPARTED_CUSTOMER: 'ออกจากโรงงานลูกค้า',
  ARRIVED_PLANT: 'กลับถึงโรงงานเรา',
  WEIGHED_LOADED_IN: 'ชั่งรถรวมของ',
  UNLOADING: 'กำลังลงของ',
  WEIGHED_EMPTY_AFTER_UNLOAD: 'ชั่งหลังลงของ',
  RECONCILED: 'รอจัดการลงเป้',
  COMPLETED: 'เสร็จสิ้น',
};

export default function InboundPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingTripId, setProcessingTripId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/trips');
      if (!response.ok) throw new Error('Failed to load trips');
      const payload = (await response.json()) as Trip[];
      setTrips(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      console.error('Error loading inbound trips:', fetchError);
      setError('ไม่สามารถโหลดเที่ยวสำหรับจัดการ Inbound Materials ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const inboundTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        if (trip.trip_type !== 'INBOUND_PURCHASE') return false;
        if (trip.status !== 'RECONCILED' && trip.status !== 'PACKING') return false;
        return !trip.inbound_removed_at;
      })
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [trips]);

  const removedInboundTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        if (trip.trip_type !== 'INBOUND_PURCHASE') return false;
        if (!trip.inbound_removed_at) return false;
        return trip.status === 'RECONCILED' || trip.status === 'PACKING';
      })
      .sort(
        (a, b) =>
          +new Date(b.inbound_removed_at ?? b.updated_at) -
          +new Date(a.inbound_removed_at ?? a.updated_at)
      );
  }, [trips]);

  const updateInboundQueueState = async (
    tripId: string,
    payload: { inbound_removed_at: string | null; inbound_removed_reason: string | null }
  ) => {
    try {
      setProcessingTripId(tripId);
      setError('');

      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update inbound queue state');
      }

      await loadTrips();
    } catch (updateError) {
      console.error('Error updating inbound queue state:', updateError);
      setError('ไม่สามารถอัปเดตคิว Inbound ได้');
    } finally {
      setProcessingTripId(null);
    }
  };

  const removeFromQueue = async (trip: Trip) => {
    const reason = window.prompt('เหตุผลที่นำเที่ยวนี้ออกจากคิว Inbound (ไม่บังคับ):', '') ?? null;
    if (reason === null) return;

    await updateInboundQueueState(trip.id, {
      inbound_removed_at: new Date().toISOString(),
      inbound_removed_reason: reason.trim() || null,
    });
  };

  const restoreToQueue = async (trip: Trip) => {
    await updateInboundQueueState(trip.id, {
      inbound_removed_at: null,
      inbound_removed_reason: null,
    });
  };

  const deletePermanently = async (trip: Trip) => {
    const confirmed = window.confirm(
      `ยืนยันลบถาวรเที่ยว ${trip.id.slice(-8).toUpperCase()} ?\nการลบนี้ไม่สามารถย้อนกลับได้`
    );
    if (!confirmed) return;

    try {
      setProcessingTripId(trip.id);
      setError('');

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete trip permanently');
      }

      setTrips((prev) => prev.filter((row) => row.id !== trip.id));
    } catch (deleteError) {
      console.error('Error deleting removed inbound trip:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'ไม่สามารถลบถาวรได้');
    } finally {
      setProcessingTripId(null);
    }
  };

  return (
    <div className="app-page trips-page inbound-page min-h-screen">
      <div className="container trips-container">
        <div className="py-6 trips-content">
          <div className="inbound-header-row">
            <div>
              <h1 className="app-title">Inbound Materials</h1>
              <p className="app-subtitle">เลือกเที่ยวเพื่อเข้าไปจัดการลงเป้ในหน้าถัดไป</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void loadTrips()}
              disabled={loading || Boolean(processingTripId)}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <Card className="trip-card">
            <div className="inbound-list-header">
              <h3 className="text-lg font-semibold">เที่ยวที่รอลงเป้</h3>
              <Badge variant="secondary">{inboundTrips.length} เที่ยว</Badge>
            </div>

            {inboundTrips.length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีเที่ยวที่พร้อมลงเป้จากหน้า Trips</p>
            ) : (
              <div className="table-container">
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสเที่ยว</TableHead>
                      <TableHead>ทะเบียนรถ</TableHead>
                      <TableHead>คู่ค้า</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inboundTrips.map((trip) => {
                      const isProcessing = processingTripId === trip.id;

                      return (
                        <TableRow key={trip.id}>
                          <TableCell className="trip-id">{trip.id.slice(-8).toUpperCase()}</TableCell>
                          <TableCell>{trip.vehicle_id || '-'}</TableCell>
                          <TableCell>{trip.partner?.factory_name || trip.partner?.name || '-'}</TableCell>
                          <TableCell>
                            <span className="table-status pending">
                              {STATUS_LABELS[trip.status] ?? trip.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(trip.created_at).toLocaleDateString('th-TH')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline" disabled={isProcessing}>
                                <Link href={`/operations/inbound/${trip.id}`}>เข้าไปลงเป้</Link>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => void removeFromQueue(trip)}
                                disabled={isProcessing || loading}
                              >
                                นำออกจากคิว
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <Card className="trip-card mt-4">
            <div className="inbound-list-header">
              <h3 className="text-lg font-semibold">รายการที่นำออกจากคิว</h3>
              <Badge variant="secondary">{removedInboundTrips.length} เที่ยว</Badge>
            </div>

            {removedInboundTrips.length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีรายการที่นำออกจากคิว</p>
            ) : (
              <div className="table-container">
                <Table className="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสเที่ยว</TableHead>
                      <TableHead>ทะเบียนรถ</TableHead>
                      <TableHead>เหตุผล</TableHead>
                      <TableHead>วันที่นำออก</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {removedInboundTrips.map((trip) => {
                      const isProcessing = processingTripId === trip.id;

                      return (
                        <TableRow key={trip.id}>
                          <TableCell className="trip-id">{trip.id.slice(-8).toUpperCase()}</TableCell>
                          <TableCell>{trip.vehicle_id || '-'}</TableCell>
                          <TableCell>{trip.inbound_removed_reason || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {trip.inbound_removed_at
                              ? new Date(trip.inbound_removed_at).toLocaleString('th-TH')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void restoreToQueue(trip)}
                                disabled={isProcessing || loading}
                              >
                                นำกลับเข้าคิว
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => void deletePermanently(trip)}
                                disabled={isProcessing || loading}
                              >
                                ลบถาวร
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
