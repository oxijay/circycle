import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { StepFourSummary, TripMaterial } from '../types';

interface Step4SectionProps {
  materials: TripMaterial[];
  isInitialWeightSkipped: boolean;
  loadedWeightIn: number;
  suggestedLoadedWeightIn: number;
  onSubmitLoadedWeightIn: (value: number) => Promise<void>;
  onSubmitMaterialReceivedWeight: (index: number, value: number) => Promise<void>;
  onClearMaterialReceivedWeight: (index: number) => Promise<void>;
  parseWeightInput: (raw: string) => number;
  numberInputValue: (value: number) => string;
  preventDecimalInput: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  selectInputValueOnFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
  stepFourSummary: StepFourSummary;
  formatWeight: (value: number) => string;
  loading?: boolean;
}

export default function Step4Section({
  materials,
  isInitialWeightSkipped,
  loadedWeightIn,
  suggestedLoadedWeightIn,
  onSubmitLoadedWeightIn,
  onSubmitMaterialReceivedWeight,
  onClearMaterialReceivedWeight,
  parseWeightInput,
  numberInputValue,
  preventDecimalInput,
  selectInputValueOnFocus,
  stepFourSummary,
  formatWeight,
  loading = false,
}: Step4SectionProps) {
  const inboundTableColsClass = "grid-cols-[1.2fr_1fr_minmax(240px,_1.4fr)_auto]";
  const allMaterialRows = useMemo(
    () =>
      materials
        .map((row, index) => ({ row, index }))
        .filter(
          ({ row }) => row.material_type.trim().length > 0 && (Number(row.customer_weight) || 0) > 0
        ),
    [materials]
  );

  const pendingMaterialRows = useMemo(
    () => allMaterialRows.filter(({ row }) => (Number(row.received_weight) || 0) <= 0),
    [allMaterialRows]
  );

  const submittedMaterialRows = allMaterialRows.filter(
    ({ row }) => (Number(row.received_weight) || 0) > 0
  );

  const resolvedLoadedWeightIn = loadedWeightIn > 0 ? loadedWeightIn : suggestedLoadedWeightIn;

  const [loadedWeightDraft, setLoadedWeightDraft] = useState('');
  const [receivedWeightDrafts, setReceivedWeightDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoadedWeightDraft(numberInputValue(resolvedLoadedWeightIn));
  }, [resolvedLoadedWeightIn, numberInputValue]);

  useEffect(() => {
    setReceivedWeightDrafts((prev) => {
      const next = { ...prev };
      const activeKeys = new Set<string>();

      pendingMaterialRows.forEach(({ row, index }) => {
        const key = row.id ?? `material-${index}`;
        activeKeys.add(key);

        if (next[key] === undefined) {
          next[key] = numberInputValue(Number(row.received_weight) || 0);
        }
      });

      Object.keys(next).forEach((key) => {
        if (!activeKeys.has(key)) {
          delete next[key];
        }
      });

      return next;
    });
  }, [pendingMaterialRows, numberInputValue]);

  return (
    <div className="step-split-layout step-section mb-4">
      <Card className="trip-card sub-card step-input-panel">
        <h4 className="text-lg font-medium mb-3">กรอกน้ำหนักขาเข้า</h4>

        <div className="step-summary-table mb-5">
          <div className={`step-summary-row step-summary-head ${inboundTableColsClass}`}>
            <span>รายการ</span>
            <span>น้ำหนักลูกค้า (กก.)</span>
            <span>น้ำหนักขาเข้า (กก.)</span>
            <span className="text-right">ดึงข้อมูล</span>
          </div>

          {!isInitialWeightSkipped && (
            <div className={`step-summary-row ${inboundTableColsClass}`}>
              <span>รถขาเข้า</span>
              <span>{formatWeight(suggestedLoadedWeightIn)}</span>
              <span>
                <div className="grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-2">
                  <Input
                    type="number"
                    value={loadedWeightDraft}
                    onChange={(e) => setLoadedWeightDraft(e.target.value)}
                    onFocus={(event) => {
                      if (loadedWeightDraft === '' && suggestedLoadedWeightIn > 0) {
                        setLoadedWeightDraft(numberInputValue(suggestedLoadedWeightIn));
                      }
                      selectInputValueOnFocus(event);
                    }}
                    onKeyDown={preventDecimalInput}
                    className="form-input"
                    placeholder="0"
                    step={1}
                    min={0}
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      const value = parseWeightInput(loadedWeightDraft);
                      void (async () => {
                        await onSubmitLoadedWeightIn(value);
                        setLoadedWeightDraft(numberInputValue(value));
                      })();
                    }}
                    disabled={loading}
                    title="บันทึกน้ำหนักรถขาเข้า"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </span>
              <span className="text-right text-xs text-muted-foreground">-</span>
            </div>
          )}

          {pendingMaterialRows.map(({ row, index }) => {
            const rowKey = row.id ?? `material-${index}`;
            const customerWeight = Number(row.customer_weight) || 0;

            return (
              <div
                key={row.id ?? `step3-material-${index}`}
                className={`step-summary-row ${inboundTableColsClass}`}
              >
                <span>{row.material_type}</span>
                <span>{formatWeight(customerWeight)}</span>
                <span>
                  <div className="grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-2">
                    <Input
                      type="number"
                      value={receivedWeightDrafts[rowKey] ?? ''}
                      onChange={(e) =>
                        setReceivedWeightDrafts((prev) => ({
                          ...prev,
                          [rowKey]: e.target.value,
                        }))
                      }
                      onFocus={selectInputValueOnFocus}
                      onKeyDown={preventDecimalInput}
                      className="form-input"
                      placeholder="0"
                      step={1}
                      min={0}
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        const value = parseWeightInput(receivedWeightDrafts[rowKey] ?? '');
                        void (async () => {
                          await onSubmitMaterialReceivedWeight(index, value);
                          setReceivedWeightDrafts((prev) => ({
                            ...prev,
                            [rowKey]: numberInputValue(value),
                          }));
                        })();
                      }}
                      disabled={loading}
                      title="บันทึกน้ำหนักขาเข้ารายการนี้"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </span>
                <span className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-blue-700 hover:text-blue-800"
                    onClick={() =>
                      setReceivedWeightDrafts((prev) => ({
                        ...prev,
                        [rowKey]: numberInputValue(customerWeight),
                      }))
                    }
                    disabled={loading}
                    title="ดึงน้ำหนักลูกค้ามาใส่"
                  >
                    ใช้น้ำหนักลูกค้า
                  </Button>
                </span>
              </div>
            );
          })}

          {pendingMaterialRows.length === 0 && (
            <div className={`step-summary-row ${inboundTableColsClass}`}>
              <span className="col-span-4 py-1 text-sm text-muted-foreground">
                {allMaterialRows.length === 0
                  ? "ยังไม่มีรายการ scrap จาก Step 2"
                  : "บันทึกน้ำหนักขาเข้าครบทุกรายการแล้ว"}
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card className="trip-card sub-card step-summary-panel">
        <h4 className="text-lg font-medium mb-3">สรุปผลน้ำหนักขาเข้า</h4>
        <div className="step-summary-table">
          <div className="step-summary-row step-summary-head">
            <span>รายการ</span>
            <span>ลูกค้า/คาดการณ์ (กก.)</span>
            <span>ขาเข้า (กก.) / ส่วนต่าง</span>
          </div>

          {!isInitialWeightSkipped && (
            <div className="step-summary-row">
              <span>รถขาเข้า</span>
              <span>{formatWeight(suggestedLoadedWeightIn)}</span>
              <span>
                {(Number(loadedWeightIn) || 0) > 0
                  ? `${formatWeight(loadedWeightIn)} (${formatWeight(loadedWeightIn - suggestedLoadedWeightIn)})`
                  : '-'}
              </span>
            </div>
          )}

          {submittedMaterialRows.map(({ row, index }) => {
            const customerWeight = Number(row.customer_weight) || 0;
            const inboundWeight = Number(row.received_weight) || 0;
            const variance = inboundWeight - customerWeight;

            return (
              <div key={row.id ?? `summary-material-${index}`} className="step-summary-row">
                <span>{row.material_type}</span>
                <span>{formatWeight(customerWeight)}</span>
                <span className="flex items-center justify-between gap-2">
                  <span>
                    {inboundWeight > 0 ? `${formatWeight(inboundWeight)} (${formatWeight(variance)})` : '-'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800"
                    onClick={() => void onClearMaterialReceivedWeight(index)}
                    disabled={loading}
                    title="ย้ายรายการกลับไปแก้ไขฝั่งซ้าย"
                  >
                    ย้อนกลับ
                  </Button>
                </span>
              </div>
            );
          })}

          {submittedMaterialRows.length === 0 && (
            <div className="py-2 text-sm text-muted-foreground">
              ยังไม่มีรายการ scrap ในสรุป กรอกน้ำหนักแล้วกดปุ่ม + เพื่อเพิ่มรายการ
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>
            <label className="form-label">น้ำหนักของที่ขนมา (จริง) (กก.)</label>
            <div className="form-display">{formatWeight(stepFourSummary.cargoActual)}</div>
          </div>
          <div>
            <label className="form-label">น้ำหนักต่างรวม (จริง - ลูกค้า) (กก.)</label>
            <div className="form-display weight-diff">{formatWeight(stepFourSummary.variance)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
