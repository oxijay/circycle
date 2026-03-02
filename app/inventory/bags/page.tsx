"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GitMerge, QrCode, Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ZoneOption = {
  id: string;
  zone_code: string;
  zone_name: string;
  slots: Array<{
    id: string;
    slot_code: string;
    slot_name: string | null;
  }>;
};

type BagRow = {
  id: string;
  bag_code: string;
  material: string | null;
  current_weight: number;
  status: "OPEN" | "PARTIAL" | "SOLD" | "SPLIT" | "CLOSED";
  ready_for_sale: boolean;
  created_at: string;
  storage_slot_id: string | null;
  storage_slot?: {
    id: string;
    slot_code: string;
    slot_name: string | null;
    zone: {
      id: string;
      zone_code: string;
      zone_name: string;
    };
  } | null;
};

type FilterState = {
  q: string;
  status: string;
  ready: string;
  zone_id: string;
  slot_id: string;
};

const STATUS_LABELS: Record<BagRow["status"], string> = {
  OPEN: "เปิดใช้งาน",
  PARTIAL: "ขายบางส่วน",
  SOLD: "ขายหมด",
  SPLIT: "แยกเป้",
  CLOSED: "ปิด",
};

const defaultFilters: FilterState = {
  q: "",
  status: "",
  ready: "",
  zone_id: "",
  slot_id: "",
};

const formatWeight = (value: number): string => Math.round(value || 0).toLocaleString("th-TH");

function statusVariant(status: BagRow["status"]): "outline" | "default" | "secondary" {
  if (status === "OPEN") return "default";
  if (status === "PARTIAL") return "secondary";
  return "outline";
}

export default function InventoryBagsPage() {
  const [bags, setBags] = useState<BagRow[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [draftFilters, setDraftFilters] = useState<FilterState>(defaultFilters);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedBagIds, setSelectedBagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingBagId, setUpdatingBagId] = useState<string | null>(null);
  const [splittingBagId, setSplittingBagId] = useState<string | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [error, setError] = useState("");

  const slotsForFilterZone = useMemo(() => {
    if (!draftFilters.zone_id) return [];
    return zones.find((zone) => zone.id === draftFilters.zone_id)?.slots ?? [];
  }, [zones, draftFilters.zone_id]);

  const allSlotOptions = useMemo(() => {
    return zones.flatMap((zone) =>
      zone.slots.map((slot) => ({
        ...slot,
        zone_id: zone.id,
        zone_code: zone.zone_code,
      }))
    );
  }, [zones]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (filters.q.trim()) query.set("q", filters.q.trim());
      if (filters.status) query.set("status", filters.status);
      if (filters.ready) query.set("ready", filters.ready);
      if (filters.zone_id) query.set("zone_id", filters.zone_id);
      if (filters.slot_id) query.set("slot_id", filters.slot_id);

      const [bagsResponse, zonesResponse] = await Promise.all([
        fetch(`/api/bags?${query.toString()}`),
        fetch("/api/storage/zones"),
      ]);

      if (!bagsResponse.ok || !zonesResponse.ok) {
        throw new Error("Failed to load inventory data");
      }

      const [bagsPayload, zonesPayload] = await Promise.all([
        bagsResponse.json(),
        zonesResponse.json(),
      ]);

      setBags(Array.isArray(bagsPayload) ? bagsPayload : []);
      setZones(Array.isArray(zonesPayload) ? zonesPayload : []);
    } catch (fetchError) {
      console.error("Error loading bag inventory:", fetchError);
      setError("ไม่สามารถโหลดข้อมูล Bag Inventory ได้");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedBagIds((prev) => prev.filter((id) => bags.some((bag) => bag.id === id)));
  }, [bags]);

  const applyFilters = () => {
    setFilters(draftFilters);
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  const updateBagLocation = async (bagId: string, slotId: string) => {
    try {
      setUpdatingBagId(bagId);
      setError("");

      const response = await fetch(`/api/bags/${bagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_slot_id: slotId || null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to update bag location");
      }

      await loadData();
    } catch (updateError) {
      console.error("Error updating bag location:", updateError);
      setError(updateError instanceof Error ? updateError.message : "ไม่สามารถอัปเดตตำแหน่งเป้ได้");
    } finally {
      setUpdatingBagId(null);
    }
  };

  const canSelectForMerge = (bag: BagRow): boolean => {
    const remaining = Math.max(0, Math.round(Number(bag.current_weight) || 0));
    return remaining > 0 && bag.status !== "SOLD" && bag.status !== "CLOSED";
  };

  const toggleSelectBag = (bag: BagRow) => {
    if (!canSelectForMerge(bag)) return;
    setSelectedBagIds((prev) =>
      prev.includes(bag.id) ? prev.filter((id) => id !== bag.id) : [...prev, bag.id]
    );
  };

  const splitBag = async (bag: BagRow) => {
    const remaining = Math.max(0, Math.round(Number(bag.current_weight) || 0));
    if (remaining <= 0) {
      setError("เป้นี้ไม่มีน้ำหนักคงเหลือให้แยก");
      return;
    }

    const raw = window.prompt(
      `แยกเป้ ${bag.bag_code} (${formatWeight(remaining)} กก.)\nกรอกน้ำหนักที่ต้องการแยก คั่นด้วยคอมมา เช่น 300,200`,
      ""
    );
    if (raw === null) return;

    const weights = raw
      .split(",")
      .map((part) => Math.max(0, Math.round(Number(part.trim()) || 0)))
      .filter((value) => value > 0);

    if (weights.length === 0) {
      setError("กรุณากรอกน้ำหนักที่ต้องการแยกอย่างน้อย 1 ค่า");
      return;
    }

    const total = weights.reduce((sum, value) => sum + value, 0);
    if (total > remaining) {
      setError(`น้ำหนักรวมที่แยก (${formatWeight(total)}) เกินน้ำหนักคงเหลือ (${formatWeight(remaining)})`);
      return;
    }

    const note = window.prompt("หมายเหตุการแยกเป้ (ไม่บังคับ):", "");
    if (note === null) return;

    try {
      setSplittingBagId(bag.id);
      setError("");

      const response = await fetch(`/api/bags/${bag.id}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weights,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to split bag");
      }

      await loadData();
    } catch (splitError) {
      console.error("Error splitting bag:", splitError);
      setError(splitError instanceof Error ? splitError.message : "ไม่สามารถแยกเป้ได้");
    } finally {
      setSplittingBagId(null);
    }
  };

  const mergeSelectedBags = async () => {
    if (selectedBagIds.length < 2) {
      setError("ต้องเลือกอย่างน้อย 2 เป้เพื่อรวม");
      return;
    }

    const note = window.prompt("หมายเหตุการรวมเป้ (ไม่บังคับ):", "");
    if (note === null) return;

    try {
      setMergeLoading(true);
      setError("");

      const response = await fetch("/api/bags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_bag_ids: selectedBagIds,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to merge bags");
      }

      setSelectedBagIds([]);
      await loadData();
    } catch (mergeError) {
      console.error("Error merging bags:", mergeError);
      setError(mergeError instanceof Error ? mergeError.message : "ไม่สามารถรวมเป้ได้");
    } finally {
      setMergeLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bag Inventory</h1>
          <p className="text-sm text-muted-foreground">รายการเป้ทั้งหมด พร้อมกรองข้อมูลและตั้งตำแหน่งเก็บ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/location-settings">Location Settings</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inventory/movements">ดู Bag Movements</Link>
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
            <Input
              value={draftFilters.q}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, q: event.target.value }))
              }
              placeholder="ค้นหา รหัสเป้/ชนิด/หมายเหตุ"
            />

            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">ทุกสถานะ</option>
              <option value="OPEN">OPEN</option>
              <option value="PARTIAL">PARTIAL</option>
            </select>

            <select
              value={draftFilters.ready}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, ready: event.target.value }))
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">พร้อมขาย/รอคัดแยกทั้งหมด</option>
              <option value="ready">พร้อมขาย</option>
              <option value="sorting">รอคัดแยก</option>
            </select>

            <select
              value={draftFilters.zone_id}
              onChange={(event) => {
                const nextZoneId = event.target.value;
                setDraftFilters((prev) => ({
                  ...prev,
                  zone_id: nextZoneId,
                  slot_id: "",
                }));
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">ทุกโซน</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.zone_code} - {zone.zone_name}
                </option>
              ))}
            </select>

            <select
              value={draftFilters.slot_id}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, slot_id: event.target.value }))
              }
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">ทุกช่อง</option>
              {(draftFilters.zone_id ? slotsForFilterZone : allSlotOptions).map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.slot_code}
                  {"zone_code" in slot ? ` (${slot.zone_code})` : ""}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Button type="button" onClick={applyFilters} disabled={loading}>
                ค้นหา
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters} disabled={loading}>
                ล้าง
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">รายการเป้</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{bags.length} เป้</Badge>
              <Badge variant="outline">เลือกเพื่อรวม: {selectedBagIds.length}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSelectedBagIds(
                  bags.filter((bag) => canSelectForMerge(bag)).map((bag) => bag.id)
                )
              }
              disabled={loading || mergeLoading}
            >
              เลือกทั้งหมดที่รวมได้
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedBagIds([])}
              disabled={selectedBagIds.length === 0 || mergeLoading}
            >
              ล้างรายการเลือก
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void mergeSelectedBags()}
              disabled={mergeLoading || loading || selectedBagIds.length < 2}
              className="gap-2"
            >
              <GitMerge className="h-4 w-4" />
              รวมเป้ที่เลือก
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {bags.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเป้ตามเงื่อนไขที่เลือก</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลือก</TableHead>
                    <TableHead>รหัสเป้</TableHead>
                    <TableHead>ชนิด</TableHead>
                    <TableHead className="text-right">คงเหลือ (กก.)</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>การขาย</TableHead>
                    <TableHead>ตำแหน่งเก็บ</TableHead>
                    <TableHead>จัดการตำแหน่ง</TableHead>
                    <TableHead>เครื่องมือ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bags.map((bag) => {
                    const isUpdating = updatingBagId === bag.id;
                    const isSplitting = splittingBagId === bag.id;
                    const canMerge = canSelectForMerge(bag);
                    const isChecked = selectedBagIds.includes(bag.id);

                    return (
                      <TableRow key={bag.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-blue-600"
                            checked={isChecked}
                            disabled={!canMerge || mergeLoading || loading}
                            onChange={() => toggleSelectBag(bag)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold">{bag.bag_code}</TableCell>
                        <TableCell>{bag.material || "-"}</TableCell>
                        <TableCell className="text-right">{formatWeight(Number(bag.current_weight) || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(bag.status)}>{STATUS_LABELS[bag.status] ?? bag.status}</Badge>
                        </TableCell>
                        <TableCell>{bag.ready_for_sale ? "พร้อมขาย" : "รอคัดแยก"}</TableCell>
                        <TableCell>
                          {bag.storage_slot
                            ? `${bag.storage_slot.zone.zone_code}/${bag.storage_slot.slot_code}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <select
                            value={bag.storage_slot_id ?? ""}
                            onChange={(event) => void updateBagLocation(bag.id, event.target.value)}
                            className="h-9 min-w-[220px] rounded-md border bg-background px-3 text-sm"
                            disabled={isUpdating || loading || Boolean(splittingBagId) || mergeLoading}
                          >
                            <option value="">ไม่ระบุตำแหน่ง</option>
                            {zones.map((zone) => (
                              <optgroup
                                key={zone.id}
                                label={`${zone.zone_code} - ${zone.zone_name}`}
                              >
                                {zone.slots.map((slot) => (
                                  <option key={slot.id} value={slot.id}>
                                    {slot.slot_code}
                                    {slot.slot_name ? ` (${slot.slot_name})` : ""}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button asChild type="button" size="sm" variant="outline" className="gap-1.5">
                              <Link
                                href={`/inventory/bags/${bag.id}/qr`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <QrCode className="h-4 w-4" />
                                QR
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => void splitBag(bag)}
                              disabled={
                                isSplitting ||
                                loading ||
                                mergeLoading ||
                                Math.max(0, Math.round(Number(bag.current_weight) || 0)) <= 0
                              }
                            >
                              <Scissors className="h-4 w-4" />
                              แยกเป้
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
        </CardContent>
      </Card>
    </div>
  );
}
