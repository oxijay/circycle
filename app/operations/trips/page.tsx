'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { STATUS_LABELS, TRIP_TYPE_LABELS } from './constants';
import TripActiveTable from './components/trip-active-table';
import Step3Section from './components/step3-section';
import Step4Section from './components/step4-section';
import TripHistoryTable from './components/trip-history-table';
import TripProcessHeader from './components/trip-process-header';
import TripTimeline from './components/trip-timeline';
import { useTripWorkflow } from './hooks/use-trip-workflow';
import type { TripType } from './types';

const RecyclingManagementSystem: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoCreatedRef = useRef(false);
  const hadTripInNewFlowRef = useRef(false);
  const openedTripFromQueryRef = useRef<string>('');
  const enteredFromMenuRouteRef = useRef(false);
  const {
    activeTrips,
    currentTrip,
    currentStep,
    loading,
    error,
    vehicleOptions,
    driverOptions,
    filteredPartners,
    historyTrips,
    historyPage,
    historyTotal,
    historyTotalPages,
    historyLoading,
    materialSummary,
    stepThreeSummary,
    stepFourSummary,
    canDeletePersistedMaterials,
    isInitialWeightSkipped,
    suggestedLoadedWeightIn,
    isNextStepDisabled,
    steps,
    materialOptions,
    maxMaterialRows,
    lastStep,
    createNewTrip,
    cleanupStaleActiveTrips,
    openTrip,
    nextStep,
    jumpToStep,
    saveCurrentStep,
    resetTrip,
    updateTripField,
    updateTripType,
    updateVehicleSelection,
    updatePartnerSelection,
    submitMaterialReceivedWeight,
    clearMaterialReceivedWeight,
    submitLoadedInboundWeight,
    setInitialWeight,
    toggleInitialWeightSkip,
    clearInitialWeight,
    addMaterialItem,
    removeMaterialRow,
    preventDecimalInput,
    selectInputValueOnFocus,
    numberInputValue,
    parseWeightInput,
    formatWeight,
    setHistoryPage,
  } = useTripWorkflow();
  const requestedTripId = searchParams.get('trip');
  const shouldCreateFromMenu = searchParams.get('new') === '1' && !requestedTripId;

  useEffect(() => {
    if (!requestedTripId) {
      openedTripFromQueryRef.current = '';
      return;
    }

    enteredFromMenuRouteRef.current = true;

    if (loading) return;
    if (currentTrip?.id === requestedTripId) {
      openedTripFromQueryRef.current = requestedTripId;
      return;
    }
    if (openedTripFromQueryRef.current === requestedTripId) return;

    openedTripFromQueryRef.current = requestedTripId;
    void openTrip(requestedTripId);
  }, [requestedTripId, loading, currentTrip?.id, openTrip]);

  useEffect(() => {
    if (!shouldCreateFromMenu) {
      hasAutoCreatedRef.current = false;
      hadTripInNewFlowRef.current = false;
      return;
    }

    enteredFromMenuRouteRef.current = true;

    if (hasAutoCreatedRef.current || loading || currentTrip) return;

    hasAutoCreatedRef.current = true;
    void (async () => {
      await createNewTrip();
    })();
  }, [shouldCreateFromMenu, loading, currentTrip, createNewTrip]);

  useEffect(() => {
    if (!shouldCreateFromMenu) return;
    if (currentTrip) {
      hadTripInNewFlowRef.current = true;
      return;
    }
    if (!hadTripInNewFlowRef.current || loading) return;

    hasAutoCreatedRef.current = false;
    hadTripInNewFlowRef.current = false;
    router.replace('/operations/trips');
  }, [shouldCreateFromMenu, loading, currentTrip, router]);

  useEffect(() => {
    if (requestedTripId || shouldCreateFromMenu) return;
    if (!currentTrip) {
      enteredFromMenuRouteRef.current = false;
      return;
    }
    if (!enteredFromMenuRouteRef.current) return;

    openedTripFromQueryRef.current = '';
    hasAutoCreatedRef.current = false;
    hadTripInNewFlowRef.current = false;
    enteredFromMenuRouteRef.current = false;
    resetTrip();
  }, [requestedTripId, shouldCreateFromMenu, currentTrip, resetTrip]);

  const handleResetTrip = () => {
    resetTrip();
    if (requestedTripId || shouldCreateFromMenu) {
      router.replace('/operations/trips');
    }
  };

  const handleResumeTrip = (tripId: string) => {
    router.push(`/operations/trips?trip=${tripId}`);
  };

  const handleCleanupStaleTrips = async () => {
    const input = window.prompt('ลบเที่ยวค้างที่ไม่ได้อัปเดตกี่วันขึ้นไป?', '30');
    if (input === null) return;
    const days = Math.max(0, Number.parseInt(input, 10) || 0);
    const confirmed = window.confirm(
      `ยืนยันลบเที่ยวที่ยังไม่ปิดและไม่ได้อัปเดตเกิน ${days} วัน?`
    );
    if (!confirmed) return;

    const result = await cleanupStaleActiveTrips(days);
    if (!result) return;
    window.alert(
      `ลบสำเร็จ ${result.deleted ?? 0} รายการ (ตรวจสอบ ${result.scanned ?? 0} รายการ)`
    );
  };

  return (
    <div className="app-page trips-page min-h-screen">
      <div className="container trips-container">
        <div className="py-6 trips-content">
          <div className="app-header-row mb-3">
            <div>
              <h1 className="app-title">Trips</h1>
              <p className="app-subtitle">จัดการเที่ยวขนส่งตั้งแต่สร้างเที่ยวจนส่งต่อเข้า Inbound</p>
            </div>
            {!currentTrip && (
              <Button onClick={() => void createNewTrip()} disabled={loading}>
                สร้างเที่ยวใหม่
              </Button>
            )}
          </div>

          {error && <div className="error-message mb-4">{error}</div>}

          {currentTrip && (
            <div className="space-y-4">
              {currentStep === 1 && (
                <Card className="trip-card trip-setup-card">
                  <div className="trip-setup-grid">
                    <div className="trip-setup-item">
                      <label className="form-label">รหัสเที่ยว</label>
                      <div className="form-display trip-id">{currentTrip.id.slice(-8).toUpperCase()}</div>
                    </div>
                    <div className="trip-setup-item">
                      <label className="form-label">ประเภทเที่ยว</label>
                      <Select
                        value={currentTrip.trip_type}
                        onValueChange={(value) => updateTripType(value as TripType)}
                      >
                        <SelectTrigger className="form-input h-10">
                          <SelectValue placeholder="เลือกประเภทเที่ยว" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INBOUND_PURCHASE">{TRIP_TYPE_LABELS.INBOUND_PURCHASE}</SelectItem>
                          <SelectItem value="OUTBOUND_SALE">{TRIP_TYPE_LABELS.OUTBOUND_SALE}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="trip-setup-item">
                      <label className="form-label">ทะเบียนรถ</label>
                      <Select
                        value={
                          currentTrip.automil_vehicle_id ??
                          vehicleOptions.find((vehicle) => vehicle.plateNo === currentTrip.vehicle_id)?.id ??
                          '__none__'
                        }
                        onValueChange={(value) => updateVehicleSelection(value === '__none__' ? '' : value)}
                      >
                        <SelectTrigger className="form-input h-10">
                          <SelectValue placeholder="เลือกทะเบียนรถ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">เลือกทะเบียนรถ</SelectItem>
                          {vehicleOptions.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.plateNo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="trip-setup-item">
                      <label className="form-label">คนขับ</label>
                      <Select
                        value={currentTrip.driver_name || '__none__'}
                        onValueChange={(value) => updateTripField('driver_name', value === '__none__' ? '' : value)}
                      >
                        <SelectTrigger className="form-input h-10">
                          <SelectValue placeholder="เลือกคนขับ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">เลือกคนขับ</SelectItem>
                          {driverOptions.map((driverName) => (
                            <SelectItem key={driverName} value={driverName}>
                              {driverName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="trip-setup-item trip-setup-wide">
                      <label className="form-label">
                        {currentTrip.trip_type === 'INBOUND_PURCHASE'
                          ? 'คู่ค้าฝั่งขาย'
                          : 'คู่ค้าฝั่งที่เราขายให้'}
                      </label>
                      <Select
                        value={currentTrip.partner_id || '__none__'}
                        onValueChange={(value) => updatePartnerSelection(value === '__none__' ? '' : value)}
                      >
                        <SelectTrigger className="form-input h-10">
                          <SelectValue placeholder="เลือกคู่ค้า" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">เลือกคู่ค้า</SelectItem>
                          {filteredPartners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.factory_name || partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="trip-setup-item trip-setup-wide">
                      <label className="form-label">โรงงาน/จุดชั่ง</label>
                      <Input
                        value={currentTrip.customer_factory}
                        onChange={(e) => updateTripField('customer_factory', e.target.value)}
                        className="form-input"
                        placeholder="ชื่อหน้างานหรือจุดชั่ง"
                      />
                    </div>
                  </div>
                </Card>
              )}

              <Card className="trip-card process-card">
                <TripProcessHeader
                  statusLabel={STATUS_LABELS[currentTrip.status]}
                  showStatusBadge={currentTrip.status !== 'ARRIVED' && currentStep !== 3}
                  currentStep={currentStep}
                  lastStep={lastStep}
                  loading={loading}
                  isNextStepDisabled={isNextStepDisabled}
                  onSaveStep={saveCurrentStep}
                  onNextStep={nextStep}
                  onResetTrip={handleResetTrip}
                  tripCode={currentTrip.id.slice(-8).toUpperCase()}
                  vehicleId={currentTrip.vehicle_id}
                  partnerName={currentTrip.partner?.factory_name || currentTrip.partner?.name || ''}
                />

                <div className="trip-timeline-wrap">
                  <TripTimeline
                    steps={steps}
                    currentStep={currentStep}
                    loading={loading}
                    onJumpToStep={jumpToStep}
                  />
                </div>

                <section className="trip-step-panel">
                  {currentStep === 2 && (
                    <Step3Section
                      initialWeight={currentTrip.initial_weight}
                      isInitialWeightSkipped={isInitialWeightSkipped}
                      onSetInitialWeight={setInitialWeight}
                      onToggleInitialWeightSkip={toggleInitialWeightSkip}
                      onClearInitialWeight={clearInitialWeight}
                      parseWeightInput={parseWeightInput}
                      preventDecimalInput={preventDecimalInput}
                      materials={currentTrip.materials ?? []}
                      maxMaterialRows={maxMaterialRows}
                      materialOptions={materialOptions}
                      loading={loading}
                      onAddMaterialItem={addMaterialItem}
                      onRemoveMaterialRow={removeMaterialRow}
                      canDeletePersistedMaterials={canDeletePersistedMaterials}
                      materialSummary={materialSummary}
                      stepThreeSummary={stepThreeSummary}
                      formatWeight={formatWeight}
                    />
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-3">
                      <Step4Section
                        materials={currentTrip.materials ?? []}
                        isInitialWeightSkipped={isInitialWeightSkipped}
                        loadedWeightIn={currentTrip.loaded_weight_in ?? 0}
                        suggestedLoadedWeightIn={suggestedLoadedWeightIn}
                        onSubmitLoadedWeightIn={submitLoadedInboundWeight}
                        onSubmitMaterialReceivedWeight={submitMaterialReceivedWeight}
                        onClearMaterialReceivedWeight={clearMaterialReceivedWeight}
                        parseWeightInput={parseWeightInput}
                        numberInputValue={numberInputValue}
                        preventDecimalInput={preventDecimalInput}
                        selectInputValueOnFocus={selectInputValueOnFocus}
                        stepFourSummary={stepFourSummary}
                        formatWeight={formatWeight}
                        loading={loading}
                      />
                    </div>
                  )}
                </section>
              </Card>
            </div>
          )}

          {!currentTrip && (
            <div className="space-y-4">
              <TripActiveTable
                activeTrips={activeTrips}
                loading={loading}
                onResumeTrip={handleResumeTrip}
                onCleanupStaleTrips={handleCleanupStaleTrips}
                getTripTypeLabel={(tripType) => TRIP_TYPE_LABELS[tripType]}
                getStatusLabel={(status) => STATUS_LABELS[status]}
                formatWeight={formatWeight}
              />
              <TripHistoryTable
                historyTrips={historyTrips}
                loading={historyLoading}
                page={historyPage}
                total={historyTotal}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
                getTripTypeLabel={(tripType) => TRIP_TYPE_LABELS[tripType]}
                getStatusLabel={(status) => STATUS_LABELS[status]}
                formatWeight={formatWeight}
              />
            </div>
          )}

          {currentStep > lastStep && (
            <div className="text-center flex justify-center gap-4">
              <Button onClick={resetTrip}>เริ่มเที่ยวใหม่</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecyclingManagementSystem;
