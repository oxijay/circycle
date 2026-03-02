'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Bag, Trip } from '@/app/operations/trips/types';

type BagDraft = {
  weight: string;
  note: string;
  readyForSale: boolean;
};

type MaterialProgressRow = {
  id: string;
  materialType: string;
  inboundWeight: number;
  allBags: Bag[];
  submittedBags: Bag[];
  draftBags: Bag[];
  submittedWeight: number;
  remaining: number;
  over: number;
  isMatched: boolean;
  pct: number;
};

const formatWeight = (value: number): string => Math.round(value).toLocaleString('th-TH');

const numberInputValue = (value: number): string => {
  if ((Number(value) || 0) <= 0) return '';
  return String(Math.round(Number(value) || 0));
};

const parseWeightInput = (raw: string): number => {
  if (raw.trim() === '') return 0;
  return Math.max(0, Math.round(Number(raw) || 0));
};

const preventDecimalInput = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === '.' || event.key === ',') {
    event.preventDefault();
  }
};

export default function InboundTripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();
  const tripId = String(params?.tripId ?? '');

  const [trip, setTrip] = useState<Trip | null>(null);
  const [bagDrafts, setBagDrafts] = useState<Record<string, BagDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTrip = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) throw new Error('Failed to load trip');
      const payload = (await response.json()) as Trip;
      setTrip(payload);
    } catch (fetchError) {
      console.error('Error loading inbound trip:', fetchError);
      setError('ไม่สามารถโหลดเที่ยวสำหรับจัดการ Inbound Materials ได้');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    setBagDrafts((prev) => {
      const next: Record<string, BagDraft> = {};
      const bags = trip?.bags ?? [];

      for (const bag of bags) {
        const previous = prev[bag.id];
        next[bag.id] = previous ?? {
          weight: numberInputValue(Number(bag.weight) || 0),
          note: bag.note ?? '',
          readyForSale: bag.ready_for_sale ?? true,
        };
      }

      return next;
    });
  }, [trip?.bags]);

  const isInboundTrip = trip?.trip_type === 'INBOUND_PURCHASE';
  const canManage =
    (trip?.status === 'RECONCILED' || trip?.status === 'PACKING') &&
    !trip?.inbound_removed_at;

  const materialRows = useMemo(() => {
    return (trip?.materials ?? [])
      .filter(
        (material) =>
          material.material_type.trim().length > 0 &&
          (Number(material.received_weight) || 0) > 0
      )
      .map((material) => ({
        id: material.id ?? `${material.material_type}-${material.received_weight}`,
        materialType: material.material_type.trim(),
        inboundWeight: Number(material.received_weight) || 0,
      }));
  }, [trip?.materials]);

  const bagsByMaterial = useMemo(() => {
    const groups = new Map<string, Bag[]>();

    for (const bag of trip?.bags ?? []) {
      const key = (bag.material ?? '').trim();
      if (!key) continue;
      const current = groups.get(key) ?? [];
      current.push(bag);
      groups.set(key, current);
    }

    return groups;
  }, [trip?.bags]);

  const materialProgress = useMemo<MaterialProgressRow[]>(() => {
    return materialRows.map((material) => {
      const allBags = bagsByMaterial.get(material.materialType) ?? [];
      const submittedBags = allBags.filter((bag) => (Number(bag.weight) || 0) > 0);
      const draftBags = allBags.filter((bag) => (Number(bag.weight) || 0) <= 0);
      const submittedWeight = submittedBags.reduce(
        (sum, bag) => sum + (Number(bag.weight) || 0),
        0
      );
      const remaining = Math.max(material.inboundWeight - submittedWeight, 0);
      const over = Math.max(submittedWeight - material.inboundWeight, 0);
      const isMatched = material.inboundWeight > 0 && remaining === 0 && over === 0;
      const pct =
        material.inboundWeight > 0
          ? Math.min((Math.max(submittedWeight, 0) / material.inboundWeight) * 100, 100)
          : 0;

      return {
        ...material,
        allBags,
        submittedBags,
        draftBags,
        submittedWeight,
        remaining,
        over,
        isMatched,
        pct,
      };
    });
  }, [materialRows, bagsByMaterial]);

  const allMaterialsMatched =
    materialProgress.length > 0 && materialProgress.every((row) => row.isMatched);

  const submittedBags = useMemo(() => {
    return (trip?.bags ?? [])
      .filter((bag) => (Number(bag.weight) || 0) > 0)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  }, [trip?.bags]);

  const getDraftWeight = useCallback(
    (bagId: string): number => parseWeightInput(bagDrafts[bagId]?.weight ?? ''),
    [bagDrafts]
  );

  const getMaxAllowedForBag = useCallback(
    (material: MaterialProgressRow, bagId: string): number => {
      const otherDraftWeights = material.draftBags
        .filter((bag) => bag.id !== bagId)
        .reduce((sum, bag) => sum + getDraftWeight(bag.id), 0);

      return Math.max(material.inboundWeight - material.submittedWeight - otherDraftWeights, 0);
    },
    [getDraftWeight]
  );

  const updateTripStatus = useCallback(
    async (status: Trip['status']) => {
      if (!tripId) return;

      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to update trip status');
      }
    },
    [tripId]
  );

  const ensurePackingStatus = useCallback(async () => {
    if (!trip) return;
    if (trip.status === 'RECONCILED') {
      await updateTripStatus('PACKING');
      setTrip((prev) => (prev ? { ...prev, status: 'PACKING' } : prev));
    }
  }, [trip, updateTripStatus]);

  const addBagForMaterial = async (materialType: string) => {
    if (!trip || !canManage) return;

    try {
      setSaving(true);
      setError('');
      await ensurePackingStatus();

      const response = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          weight: 0,
          material: materialType,
          note: '',
          ready_for_sale: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to add bag');
      await loadTrip();
    } catch (saveError) {
      console.error('Error adding bag:', saveError);
      setError('ไม่สามารถเพิ่มเป้ได้');
    } finally {
      setSaving(false);
    }
  };

  const removeBag = async (bagId: string) => {
    if (!trip || !canManage) return;

    try {
      setSaving(true);
      setError('');
      await ensurePackingStatus();

      const response = await fetch(`/api/bags/${bagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bag');
      await loadTrip();
    } catch (saveError) {
      console.error('Error deleting bag:', saveError);
      setError('ไม่สามารถลบเป้ได้');
    } finally {
      setSaving(false);
    }
  };

  const submitBag = async (bag: Bag, material: MaterialProgressRow) => {
    if (!trip || !canManage) return;

    const draft = bagDrafts[bag.id];
    if (!draft) return;

    const weight = parseWeightInput(draft.weight);
    if (weight <= 0) {
      setError(`กรุณากรอกน้ำหนักของเป้ ${bag.bag_code} ให้มากกว่า 0`);
      return;
    }

    const maxAllowed = getMaxAllowedForBag(material, bag.id);
    if (weight > maxAllowed) {
      setError(
        `น้ำหนักของเป้ ${bag.bag_code} เกินน้ำหนักขาเข้าที่เหลือของ ${material.materialType} (เหลือ ${formatWeight(maxAllowed)} กก.)`
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      await ensurePackingStatus();

      const response = await fetch(`/api/bags/${bag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: material.materialType,
          weight,
          note: draft.note.trim() || null,
          ready_for_sale: draft.readyForSale,
        }),
      });

      if (!response.ok) throw new Error('Failed to update bag');
      await loadTrip();
    } catch (saveError) {
      console.error('Error updating bag:', saveError);
      setError('ไม่สามารถบันทึกข้อมูลเป้ได้');
    } finally {
      setSaving(false);
    }
  };

  const completeTrip = async () => {
    if (!trip || !allMaterialsMatched || !canManage) return;

    try {
      setSaving(true);
      setError('');
      await updateTripStatus('COMPLETED');
      router.push('/operations/inbound');
    } catch (saveError) {
      console.error('Error completing trip:', saveError);
      setError('ไม่สามารถปิดเที่ยวได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page trips-page inbound-page min-h-screen">
      <div className="container trips-container">
        <div className="py-6 trips-content">
          <div className="inbound-header-row">
            <div>
              <h1 className="app-title">Inbound Materials</h1>
              <p className="app-subtitle">จัดการใส่เป้แบบแยกตามชนิด scrap</p>
            </div>
            <div className="flex gap-2">
              <Button asChild type="button" variant="outline" className="gap-2">
                <Link href="/operations/inbound">
                  <ArrowLeft className="h-4 w-4" />
                  กลับไปตารางเที่ยว
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void loadTrip()}
                disabled={loading || saving}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {!loading && (!trip || !isInboundTrip) && (
            <Card className="trip-card">
              <p className="text-muted-foreground">ไม่พบเที่ยว Inbound ที่เลือก</p>
            </Card>
          )}

          {trip && isInboundTrip && (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
              <Card className="trip-card sub-card">
                <div className="inbound-process-head">
                  <div>
                    <h3 className="text-lg font-semibold">รายการวัสดุขาเข้า - เที่ยว {trip.id.slice(-8).toUpperCase()}</h3>
                    <p className="text-muted-foreground">
                      ทะเบียน {trip.vehicle_id || '-'} | คนขับ {trip.driver_name || '-'}
                    </p>
                  </div>
                </div>

                {trip.inbound_removed_at && (
                  <div className="mb-3 rounded-md border border-[var(--tp-border)] bg-[var(--tp-subsurface)] px-3 py-2 text-sm text-muted-foreground">
                    เที่ยวนี้ถูกนำออกจากคิว Inbound แล้ว ({new Date(trip.inbound_removed_at).toLocaleString('th-TH')})
                  </div>
                )}

                <div className="space-y-4">
                  {materialProgress.map((material) => (
                    <div key={material.id} className="rounded-md border border-[var(--tp-border)] bg-[var(--tp-subsurface)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{material.materialType}</div>
                          <div className="text-sm text-muted-foreground">
                            น้ำหนักขาเข้า: {formatWeight(material.inboundWeight)} กก.
                          </div>
                        </div>
                        {canManage && !allMaterialsMatched && material.remaining > 0 && (
                          <Button
                            type="button"
                            className="gap-2"
                            onClick={() => void addBagForMaterial(material.materialType)}
                            disabled={saving}
                          >
                            <Plus className="h-4 w-4" />
                            เพิ่มเป้
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">ลงเป้แล้ว:</span>{' '}
                        <span className="font-medium">{formatWeight(material.submittedWeight)} กก.</span>{' '}
                        <span className="text-muted-foreground">({Math.round(material.pct)}%)</span>
                        {material.over > 0 ? (
                          <span className="ml-2 text-red-600">เกิน {formatWeight(material.over)} กก.</span>
                        ) : material.remaining > 0 ? (
                          <span className="ml-2 text-amber-600">คงเหลือ {formatWeight(material.remaining)} กก.</span>
                        ) : (
                          <span className="ml-2 text-emerald-600">ครบแล้ว</span>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        {material.draftBags.map((bag) => {
                          const draft = bagDrafts[bag.id] ?? {
                            weight: numberInputValue(Number(bag.weight) || 0),
                            note: bag.note ?? '',
                            readyForSale: bag.ready_for_sale ?? true,
                          };
                          const maxAllowed = getMaxAllowedForBag(material, bag.id);

                          return (
                            <div
                              key={bag.id}
                              className="ml-4 border-l-2 border-[var(--tp-border)] pl-3"
                            >
                              <div className="grid gap-2 rounded-md border border-[var(--tp-border)] bg-white p-2.5">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">รหัสเป้:</span>{' '}
                                  <span className="bag-code font-semibold">{bag.bag_code}</span>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                  <div>
                                    <label className="form-label">น้ำหนัก (กก.)</label>
                                    <Input
                                      type="number"
                                      value={draft.weight}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setBagDrafts((prev) => ({
                                          ...prev,
                                          [bag.id]: {
                                            ...draft,
                                            weight: value,
                                          },
                                        }));
                                      }}
                                      onKeyDown={preventDecimalInput}
                                      className="form-input"
                                      placeholder="0"
                                      step={1}
                                      min={0}
                                      inputMode="numeric"
                                    />
                                    <button
                                      type="button"
                                      className="mt-1 text-xs text-blue-600 underline underline-offset-2 disabled:text-muted-foreground"
                                      onClick={() => {
                                        setBagDrafts((prev) => ({
                                          ...prev,
                                          [bag.id]: {
                                            ...draft,
                                            weight: numberInputValue(maxAllowed),
                                          },
                                        }));
                                      }}
                                      disabled={saving || !canManage || maxAllowed <= 0}
                                    >
                                      เติมน้ำหนักที่เหลือทั้งหมด (100%)
                                    </button>
                                  </div>
                                  <div>
                                    <label className="form-label">หมายเหตุ (note)</label>
                                    <Input
                                      value={draft.note}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setBagDrafts((prev) => ({
                                          ...prev,
                                          [bag.id]: {
                                            ...draft,
                                            note: value,
                                          },
                                        }));
                                      }}
                                      className="form-input"
                                      placeholder="เช่น ปนเศษพลาสติกเล็กน้อย"
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                  <label className="flex items-center gap-2 text-sm text-[var(--tp-text)]">
                                    <input
                                      type="radio"
                                      name={`sale-status-${bag.id}`}
                                      className="h-4 w-4 border border-[var(--tp-border-strong)] accent-blue-600"
                                      checked={draft.readyForSale}
                                      onChange={() => {
                                        setBagDrafts((prev) => ({
                                          ...prev,
                                          [bag.id]: {
                                            ...draft,
                                            readyForSale: true,
                                          },
                                        }));
                                      }}
                                    />
                                    พร้อมขาย
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-[var(--tp-text)]">
                                    <input
                                      type="radio"
                                      name={`sale-status-${bag.id}`}
                                      className="h-4 w-4 border border-[var(--tp-border-strong)] accent-blue-600"
                                      checked={!draft.readyForSale}
                                      onChange={() => {
                                        setBagDrafts((prev) => ({
                                          ...prev,
                                          [bag.id]: {
                                            ...draft,
                                            readyForSale: false,
                                          },
                                        }));
                                      }}
                                    />
                                    รอคัดแยก
                                  </label>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => void submitBag(bag, material)}
                                    disabled={saving || !canManage}
                                    size="sm"
                                  >
                                    Submit รายการ
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => void removeBag(bag.id)}
                                    disabled={saving || !canManage}
                                    title="ลบเป้"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {material.draftBags.length === 0 && (
                          <div className="ml-4 text-sm text-muted-foreground">ยังไม่มีฟอร์มเป้ กดเพิ่มเป้เพื่อเริ่มกรอก</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {materialProgress.length === 0 && (
                    <p className="text-muted-foreground">เที่ยวนี้ยังไม่มีรายการวัสดุขาเข้าให้ลงเป้</p>
                  )}
                </div>
              </Card>

              <Card className="trip-card sub-card xl:sticky xl:top-4 xl:self-start">
                <h3 className="text-lg font-semibold mb-3">สรุปรายการเป้ที่ Submit แล้ว</h3>

                {submittedBags.length === 0 ? (
                  <p className="text-muted-foreground">ยังไม่มีเป้ที่ submit</p>
                ) : (
                  <div className="table-container">
                    <Table className="data-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสเป้</TableHead>
                          <TableHead>ชนิด</TableHead>
                          <TableHead className="text-right">น้ำหนัก (กก.)</TableHead>
                          <TableHead>สถานะ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submittedBags.map((bag) => (
                          <TableRow key={bag.id}>
                            <TableCell className="bag-code">{bag.bag_code}</TableCell>
                            <TableCell>{bag.material || '-'}</TableCell>
                            <TableCell className="text-right">{formatWeight(Number(bag.weight) || 0)}</TableCell>
                            <TableCell>{bag.ready_for_sale === false ? 'รอคัดแยก' : 'พร้อมขาย'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 text-sm">
                  {allMaterialsMatched ? (
                    <div className="text-emerald-600">น้ำหนักลงเป้ครบทุกรายการแล้ว พร้อมปิดเที่ยว</div>
                  ) : (
                    <div className="text-amber-600">ต้องลงน้ำหนักให้ครบทุกชนิดก่อนปิดเที่ยว</div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => void completeTrip()}
                  disabled={saving || !allMaterialsMatched || !canManage}
                  className="w-full gap-2 mt-4"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  ปิดเที่ยวและส่งเข้า Inventory
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
