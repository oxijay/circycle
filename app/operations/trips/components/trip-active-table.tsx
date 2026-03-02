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

type TripActiveRow = Trip;

interface TripActiveTableProps {
  activeTrips: TripActiveRow[];
  loading?: boolean;
  onResumeTrip: (tripId: string) => void;
  onCleanupStaleTrips: () => void;
  getTripTypeLabel: (tripType: TripType) => string;
  getStatusLabel: (status: TripStatus) => string;
  formatWeight: (value: number) => string;
}

export default function TripActiveTable({
  activeTrips,
  loading = false,
  onResumeTrip,
  onCleanupStaleTrips,
  getTripTypeLabel,
  getStatusLabel,
  formatWeight,
}: TripActiveTableProps) {
  return (
    <Card className="trip-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">เที่ยวที่กำลังดำเนินการ</h3>
        <Button
          type="button"
          variant="outline"
          onClick={onCleanupStaleTrips}
          disabled={loading}
        >
          ลบเที่ยวค้างเก่า
        </Button>
      </div>

      {activeTrips.length === 0 ? (
        <div className="text-muted-foreground">ยังไม่มีเที่ยวที่กำลังดำเนินการ</div>
      ) : (
        <div className="table-container">
          <Table className="data-table trips-active-table">
            <TableHeader>
              <TableRow>
                <TableHead>รหัสเที่ยว</TableHead>
                <TableHead>ประเภทเที่ยว</TableHead>
                <TableHead>ทะเบียนรถ</TableHead>
                <TableHead>คนขับ</TableHead>
                <TableHead>คู่ค้า</TableHead>
                <TableHead>โรงงาน</TableHead>
                <TableHead className="text-right">น้ำหนักลูกค้า (กก.)</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>อัปเดตล่าสุด</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTrips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="trip-id">{trip.id.slice(-8).toUpperCase()}</TableCell>
                  <TableCell>{getTripTypeLabel(trip.trip_type)}</TableCell>
                  <TableCell>{trip.vehicle_id || '-'}</TableCell>
                  <TableCell>{trip.driver_name || '-'}</TableCell>
                  <TableCell>{trip.partner?.factory_name || trip.partner?.name || '-'}</TableCell>
                  <TableCell>{trip.customer_factory || '-'}</TableCell>
                  <TableCell className="weight-value text-right">
                    {formatWeight(Number(trip.customer_reported_weight) || 0)}
                  </TableCell>
                  <TableCell>
                    <span className="table-status pending">{getStatusLabel(trip.status)}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(trip.updated_at).toLocaleString('th-TH')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResumeTrip(trip.id)}
                      disabled={loading}
                    >
                      ทำต่อ
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
