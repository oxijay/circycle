import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TripProcessHeaderProps {
  statusLabel: string;
  showStatusBadge: boolean;
  currentStep: number;
  lastStep: number;
  loading: boolean;
  isNextStepDisabled: boolean;
  onSaveStep: () => Promise<void>;
  onNextStep: () => Promise<void>;
  onResetTrip: () => void;
  tripCode: string;
  vehicleId: string;
  partnerName: string;
}

export default function TripProcessHeader({
  statusLabel,
  showStatusBadge,
  currentStep,
  lastStep,
  loading,
  isNextStepDisabled,
  onSaveStep,
  onNextStep,
  onResetTrip,
  tripCode,
  vehicleId,
  partnerName,
}: TripProcessHeaderProps) {
  return (
    <div className="process-header-inline mb-6">
      <div className="process-summary-grid">
        <div>
          <div className="text-sm text-muted-foreground">เที่ยว</div>
          <div className="trip-id">{tripCode}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">ทะเบียน</div>
          <div>{vehicleId || '-'}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">คู่ค้า</div>
          <div>{partnerName || '-'}</div>
        </div>
      </div>

      <div className="process-actions">
        {showStatusBadge && (
          <Badge variant="outline" className="status-badge">
            {statusLabel}
          </Badge>
        )}
        {currentStep <= lastStep && (
          <>
            <Button size="sm" variant="outline" onClick={onSaveStep} disabled={loading} className="min-w-[104px]">
              บันทึกชั่วคราว
            </Button>
            <Button size="sm" onClick={onNextStep} disabled={isNextStepDisabled} className="min-w-[104px]">
              {currentStep === lastStep ? 'เสร็จสิ้น' : 'ขั้นตอนถัดไป'}
            </Button>
            <Button size="sm" onClick={onResetTrip} variant="outline" className="min-w-[104px]">
              ยกเลิก
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
