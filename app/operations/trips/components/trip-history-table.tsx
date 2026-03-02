import React from 'react';

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
import type { Trip, TripStatus, TripType } from '../types';

type TripHistoryRow = Trip;

interface TripHistoryTableProps {
  historyTrips: TripHistoryRow[];
  loading?: boolean;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  getTripTypeLabel: (tripType: TripType) => string;
  getStatusLabel: (status: TripStatus) => string;
  formatWeight: (value: number) => string;
}

export default function TripHistoryTable({
  historyTrips,
  loading = false,
  page,
  total,
  totalPages,
  onPageChange,
  getTripTypeLabel,
  getStatusLabel,
  formatWeight,
}: TripHistoryTableProps) {
  return (
    <Card className="trip-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">ประวัติการเดินทาง (ปิดเที่ยว/ส่งต่อ Inbound แล้ว)</h3>
        <div className="text-sm text-muted-foreground">รวม {total.toLocaleString('th-TH')} รายการ</div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">กำลังโหลดประวัติการเดินทาง...</div>
      ) : historyTrips.length === 0 ? (
        <div className="text-muted-foreground">ยังไม่มีเที่ยวที่ปิดหรือส่งต่อแล้ว</div>
      ) : (
        <div className="table-container">
          <Table className="data-table trips-history-table">
            <TableHeader>
              <TableRow>
                <TableHead>รหัสเที่ยว</TableHead>
                <TableHead>ประเภทเที่ยว</TableHead>
                <TableHead>ทะเบียนรถ</TableHead>
                <TableHead>คนขับ</TableHead>
                <TableHead>คู่ค้า</TableHead>
                <TableHead>โรงงาน</TableHead>
                <TableHead className="text-right">น้ำหนัก (กก.)</TableHead>
                <TableHead className="text-right">จำนวนเป้</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyTrips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="trip-id">{trip.id.slice(-8).toUpperCase()}</TableCell>
                  <TableCell>{getTripTypeLabel(trip.trip_type)}</TableCell>
                  <TableCell>{trip.vehicle_id}</TableCell>
                  <TableCell>{trip.driver_name || '-'}</TableCell>
                  <TableCell>{trip.partner?.factory_name || trip.partner?.name || '-'}</TableCell>
                  <TableCell>{trip.customer_factory}</TableCell>
                  <TableCell className="weight-value text-right">{formatWeight(trip.weight_difference)}</TableCell>
                  <TableCell className="text-right">{trip.bags?.length || 0}</TableCell>
                  <TableCell>
                    <span className={`table-status ${trip.status === 'COMPLETED' ? 'completed' : 'pending'}`}>
                      {getStatusLabel(trip.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(trip.created_at).toLocaleDateString('th-TH')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={loading || page <= 1}
        >
          ก่อนหน้า
        </Button>
        <span className="text-sm text-muted-foreground">
          หน้า {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={loading || page >= totalPages}
        >
          ถัดไป
        </Button>
      </div>
    </Card>
  );
}
