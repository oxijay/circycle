import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { MaterialSummary, StepThreeSummary, TripMaterial } from '../types';

interface Step3SectionProps {
  initialWeight: number;
  isInitialWeightSkipped: boolean;
  onSetInitialWeight: (value: number) => void;
  onToggleInitialWeightSkip: (value: boolean) => void;
  onClearInitialWeight: () => void;
  parseWeightInput: (raw: string) => number;
  preventDecimalInput: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  materials: TripMaterial[];
  maxMaterialRows: number;
  materialOptions: string[];
  loading: boolean;
  onAddMaterialItem: (materialType: string, customerWeight: number) => void;
  onRemoveMaterialRow: (index: number) => void;
  canDeletePersistedMaterials: boolean;
  materialSummary: MaterialSummary;
  stepThreeSummary: StepThreeSummary;
  formatWeight: (value: number) => string;
}

export default function Step3Section({
  initialWeight,
  isInitialWeightSkipped,
  onSetInitialWeight,
  onToggleInitialWeightSkip,
  onClearInitialWeight,
  parseWeightInput,
  preventDecimalInput,
  materials,
  maxMaterialRows,
  materialOptions,
  loading,
  onAddMaterialItem,
  onRemoveMaterialRow,
  canDeletePersistedMaterials,
  materialSummary,
  stepThreeSummary,
  formatWeight,
}: Step3SectionProps) {
  const [emptyWeightDraft, setEmptyWeightDraft] = useState('');
  const [materialTypeDraft, setMaterialTypeDraft] = useState('');
  const [materialWeightDraft, setMaterialWeightDraft] = useState('');

  const validMaterialEntries = useMemo(
    () =>
      materials
        .map((material, index) => ({ material, index }))
        .filter(({ material }) => {
          const hasType = material.material_type.trim().length > 0;
          const hasWeight = (Number(material.customer_weight) || 0) > 0;
          return hasType && hasWeight;
        }),
    [materials]
  );

  const canAddEmptyWeight = !isInitialWeightSkipped && parseWeightInput(emptyWeightDraft) > 0;
  const currentMaterialCount = validMaterialEntries.length;
  const canAddMaterial =
    materialTypeDraft.trim().length > 0 &&
    parseWeightInput(materialWeightDraft) > 0 &&
    currentMaterialCount < maxMaterialRows;

  const handleAddEmptyWeight = () => {
    const value = parseWeightInput(emptyWeightDraft);
    if (value <= 0) return;

    onSetInitialWeight(value);
    setEmptyWeightDraft('');
  };

  const handleAddMaterial = () => {
    const type = materialTypeDraft.trim();
    const weight = parseWeightInput(materialWeightDraft);
    if (!type || weight <= 0) return;

    onAddMaterialItem(type, weight);
    setMaterialTypeDraft('');
    setMaterialWeightDraft('');
  };

  return (
    <div className="step-split-layout step-section mb-4">
      <Card className="trip-card sub-card step-input-panel">
        <div className="space-y-6">
          <label className="flex items-center gap-2 text-sm text-[var(--tp-text)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-[var(--tp-border-strong)] accent-blue-600"
              checked={isInitialWeightSkipped}
              onChange={(event) => onToggleInitialWeightSkip(event.target.checked)}
            />
            ไม่ต้องชั่งน้ำหนักรถเปล่าก่อนขึ้นของ
          </label>

          {!isInitialWeightSkipped ? (
            initialWeight <= 0 ? (
              <div className="grid grid-cols-[minmax(0,_1fr)_auto] items-end gap-3">
                <div>
                  <label className="form-label">น้ำหนักรถเปล่าก่อนขึ้นของ (กก.)</label>
                  <Input
                    type="number"
                    value={emptyWeightDraft}
                    onChange={(e) => setEmptyWeightDraft(e.target.value)}
                    onKeyDown={preventDecimalInput}
                    className="form-input"
                    placeholder="0"
                    step={1}
                    min={0}
                    inputMode="numeric"
                  />
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="min-w-[112px]"
                  onClick={handleAddEmptyWeight}
                  disabled={loading || !canAddEmptyWeight}
                >
                  เพิ่มน้ำหนัก
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">เพิ่มน้ำหนักรถเปล่าแล้ว ลบจากตารางสรุปด้านขวาเพื่อแก้ไข</div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">ระบบจะคำนวณจากน้ำหนัก scrap โดยไม่รวมรถเปล่า</div>
          )}

          <div>
            <datalist id="material-options">
              {materialOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>

            <div className="grid grid-cols-[minmax(0,_1.6fr)_minmax(0,_1fr)_auto] gap-3 items-end material-row">
              <div>
                <label className="form-label">ชนิด Scrap</label>
                <Input
                  type="text"
                  list="material-options"
                  value={materialTypeDraft}
                  onChange={(e) => setMaterialTypeDraft(e.target.value)}
                  className="form-input material-input"
                  placeholder="เช่น อลูมิเนียม, เหล็ก"
                />
              </div>
              <div>
                <label className="form-label">น้ำหนักที่ลูกค้าชั่ง (กก.)</label>
                <Input
                  type="number"
                  value={materialWeightDraft}
                  onChange={(e) => setMaterialWeightDraft(e.target.value)}
                  onKeyDown={preventDecimalInput}
                  className="form-input material-input"
                  placeholder="0"
                  step={1}
                  min={0}
                  inputMode="numeric"
                />
              </div>
              <div>
                <Button
                  type="button"
                  variant="default"
                  className="gap-2 min-w-[112px]"
                  onClick={handleAddMaterial}
                  disabled={loading || !canAddMaterial}
                >
                  <Plus className="w-4 h-4" />
                  เพิ่ม
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="trip-card sub-card step-summary-panel">
        <h4 className="text-lg font-medium mb-3">ตารางสรุปน้ำหนัก</h4>

        <div className="step-summary-table">
          <div className="step-summary-row step-summary-head">
            <span>รายการ</span>
            <span>น้ำหนัก (กก.)</span>
            <span className="text-right">จัดการ</span>
          </div>

          {!isInitialWeightSkipped && (
            <div className="step-summary-row">
              <span>น้ำหนักรถเปล่า</span>
              <span>{initialWeight > 0 ? formatWeight(initialWeight) : '-'}</span>
              <span className="text-right">
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={onClearInitialWeight}
                  disabled={loading || initialWeight <= 0}
                  title="ลบน้ำหนักรถเปล่า"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </div>
          )}

          {validMaterialEntries.map(({ material, index }) => (
            <div key={material.id ?? `material-${index}`} className="step-summary-row">
              <span>{material.material_type}</span>
              <span>{formatWeight(material.customer_weight || 0)}</span>
              <span className="text-right">
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => onRemoveMaterialRow(index)}
                  disabled={loading || (Boolean(material.id) && !canDeletePersistedMaterials)}
                  title={
                    material.id && !canDeletePersistedMaterials
                      ? 'ปิดเที่ยวแล้ว ลบรายการนี้ไม่ได้'
                      : 'ลบรายการ'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </div>
          ))}

          {validMaterialEntries.length === 0 && (
            <div className="py-2 text-sm text-muted-foreground">ยังไม่มีรายการ scrap ในตาราง</div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1 text-sm text-muted-foreground">น้ำหนักรวม (กก.)</div>
          <div className="form-display weight-diff">{formatWeight(stepThreeSummary.grossWeight)}</div>
        </div>

        {materialSummary.validRows.length === 0 && (
          <div className="mt-2 text-sm text-amber-600">
            ต้องมีอย่างน้อย 1 รายการที่ระบุชนิดและน้ำหนัก
          </div>
        )}
      </Card>
    </div>
  );
}
