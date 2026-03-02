"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, FolderTree, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StorageSlot = {
  id: string;
  slot_code: string;
  slot_name: string | null;
  _count?: {
    bags: number;
  };
};

type StorageZone = {
  id: string;
  zone_code: string;
  zone_name: string;
  _count?: {
    slots: number;
  };
  slots: StorageSlot[];
};

type MapRegionKey = "A1" | "A2" | "A3" | "A4" | "B1" | "B2" | "B3" | "B4";

type MapLayoutResponse = {
  assignments?: Array<{
    region_key: string;
    zone_id: string | null;
  }>;
};

const REGION_KEYS: MapRegionKey[] = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"];

const createEmptyRegionMap = (): Record<MapRegionKey, string> => ({
  A1: "",
  A2: "",
  A3: "",
  A4: "",
  B1: "",
  B2: "",
  B3: "",
  B4: "",
});

const FLOOR_CELL_LAYOUT = [
  { key: "A1" as const, x: 50, y: 54, w: 260, h: 224 },
  { key: "A2" as const, x: 326, y: 54, w: 260, h: 224 },
  { key: "A3" as const, x: 602, y: 54, w: 260, h: 224 },
  { key: "A4" as const, x: 878, y: 54, w: 260, h: 224 },
  { key: "B1" as const, x: 50, y: 300, w: 260, h: 224 },
  { key: "B2" as const, x: 326, y: 300, w: 260, h: 224 },
  { key: "B3" as const, x: 602, y: 300, w: 260, h: 224 },
  { key: "B4" as const, x: 878, y: 300, w: 260, h: 224 },
];

export default function LocationSettingsPage() {
  const [zones, setZones] = useState<StorageZone[]>([]);
  const [savedRegionMap, setSavedRegionMap] = useState<Record<MapRegionKey, string>>(createEmptyRegionMap);
  const [draftRegionMap, setDraftRegionMap] = useState<Record<MapRegionKey, string>>(createEmptyRegionMap);
  const [activeRegionKey, setActiveRegionKey] = useState<MapRegionKey>("A1");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [expandedZoneIds, setExpandedZoneIds] = useState<string[]>([]);

  const [zoneCodeDraft, setZoneCodeDraft] = useState("");
  const [zoneNameDraft, setZoneNameDraft] = useState("");
  const [zoneCodeEditDraft, setZoneCodeEditDraft] = useState("");
  const [zoneNameEditDraft, setZoneNameEditDraft] = useState("");

  const [slotCodeDraft, setSlotCodeDraft] = useState("");
  const [slotNameDraft, setSlotNameDraft] = useState("");
  const [slotCodeEditDraft, setSlotCodeEditDraft] = useState("");
  const [slotNameEditDraft, setSlotNameEditDraft] = useState("");

  const [searchDraft, setSearchDraft] = useState("");
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapSaving, setMapSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/storage/zones", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load zones");

      const payload = (await response.json()) as StorageZone[];
      const rows = Array.isArray(payload) ? payload : [];

      setZones(rows);
      setExpandedZoneIds((prev) => {
        const rowIds = new Set(rows.map((zone) => zone.id));
        const kept = prev.filter((id) => rowIds.has(id));
        return kept.length > 0 ? kept : rows.map((zone) => zone.id);
      });
      setSelectedZoneId((prev) => (prev && rows.some((zone) => zone.id === prev) ? prev : ""));
      setSelectedSlotId((prev) => {
        if (!prev) return "";
        for (const zone of rows) {
          if (zone.slots.some((slot) => slot.id === prev)) return prev;
        }
        return "";
      });
    } catch (fetchError) {
      console.error("Error loading storage zones:", fetchError);
      setError("ไม่สามารถโหลดข้อมูลโซนวางเป้ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMapLayout = useCallback(async () => {
    const response = await fetch("/api/storage/map-layout", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load map layout");

    const payload = (await response.json()) as MapLayoutResponse;
    const nextMap = createEmptyRegionMap();
    for (const row of payload.assignments ?? []) {
      const key = String(row.region_key ?? "").toUpperCase() as MapRegionKey;
      if (!REGION_KEYS.includes(key)) continue;
      nextMap[key] = String(row.zone_id ?? "").trim();
    }
    setSavedRegionMap(nextMap);
    setDraftRegionMap(nextMap);
  }, []);

  useEffect(() => {
    void (async () => {
      await loadZones();
      try {
        await loadMapLayout();
      } catch (loadError) {
        console.error("Error loading map layout:", loadError);
        setError("ไม่สามารถโหลดข้อมูลแผนผังโซนได้");
      }
    })();
  }, [loadZones, loadMapLayout]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const selectedSlot = useMemo(
    () => selectedZone?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [selectedZone, selectedSlotId]
  );

  useEffect(() => {
    if (!selectedZone) {
      setZoneCodeEditDraft("");
      setZoneNameEditDraft("");
      return;
    }
    setZoneCodeEditDraft(selectedZone.zone_code);
    setZoneNameEditDraft(selectedZone.zone_name);
  }, [selectedZone]);

  useEffect(() => {
    if (!selectedSlot) {
      setSlotCodeEditDraft("");
      setSlotNameEditDraft("");
      return;
    }
    setSlotCodeEditDraft(selectedSlot.slot_code);
    setSlotNameEditDraft(selectedSlot.slot_name ?? "");
  }, [selectedSlot]);

  const normalizedSearch = searchDraft.trim().toLowerCase();

  const filteredZones = useMemo(() => {
    if (!normalizedSearch) return zones;

    return zones
      .map((zone) => {
        const zoneMatches =
          zone.zone_code.toLowerCase().includes(normalizedSearch) ||
          zone.zone_name.toLowerCase().includes(normalizedSearch);

        const slots = zone.slots.filter((slot) => {
          const slotName = (slot.slot_name ?? "").toLowerCase();
          return (
            slot.slot_code.toLowerCase().includes(normalizedSearch) ||
            slotName.includes(normalizedSearch)
          );
        });

        return {
          ...zone,
          slots: zoneMatches ? zone.slots : slots,
          zoneMatches,
        };
      })
      .filter((zone) => zone.zoneMatches || zone.slots.length > 0);
  }, [zones, normalizedSearch]);

  const zonesById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone])),
    [zones]
  );

  const mapDirty = useMemo(
    () => REGION_KEYS.some((key) => (savedRegionMap[key] || "") !== (draftRegionMap[key] || "")),
    [savedRegionMap, draftRegionMap]
  );

  const activeMappedZoneId = draftRegionMap[activeRegionKey] || "";

  const selectableZonesForActiveRegion = useMemo(() => {
    const used = new Set(
      REGION_KEYS.map((key) => draftRegionMap[key]).filter((zoneId): zoneId is string => Boolean(zoneId))
    );
    return zones.filter((zone) => !used.has(zone.id) || zone.id === activeMappedZoneId);
  }, [zones, draftRegionMap, activeMappedZoneId]);

  const unmappedZones = useMemo(() => {
    const used = new Set(
      REGION_KEYS.map((key) => draftRegionMap[key]).filter((zoneId): zoneId is string => Boolean(zoneId))
    );
    return zones.filter((zone) => !used.has(zone.id));
  }, [zones, draftRegionMap]);

  const floorPreview = useMemo(
    () =>
      FLOOR_CELL_LAYOUT.map((cell) => {
        const zoneId = draftRegionMap[cell.key];
        const zone = zoneId ? zonesById.get(zoneId) ?? null : null;
        const bagCount = zone
          ? zone.slots.reduce((sum, slot) => sum + (slot._count?.bags ?? 0), 0)
          : 0;
        const slotCount = zone ? (zone._count?.slots ?? zone.slots.length) : 0;
        return {
          ...cell,
          zone,
          bagCount,
          slotCount,
          selected: cell.key === activeRegionKey,
        };
      }),
    [draftRegionMap, zonesById, activeRegionKey]
  );

  const assignZoneToActiveRegion = (zoneId: string) => {
    setDraftRegionMap((prev) => {
      const next = { ...prev };
      if (zoneId) {
        for (const key of REGION_KEYS) {
          if (key !== activeRegionKey && next[key] === zoneId) {
            next[key] = "";
          }
        }
      }
      next[activeRegionKey] = zoneId;
      return next;
    });
  };

  const saveMapLayout = async () => {
    try {
      setMapSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/storage/map-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: REGION_KEYS.map((regionKey) => ({
            region_key: regionKey,
            zone_id: draftRegionMap[regionKey] || null,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to save map layout");
      }

      setSavedRegionMap(draftRegionMap);
      setSuccess("บันทึกผังโซนสำเร็จ");
      await loadZones();
    } catch (saveError) {
      console.error("Error saving map layout:", saveError);
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกผังโซนได้");
    } finally {
      setMapSaving(false);
    }
  };

  const createZone = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/storage/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_code: zoneCodeDraft.trim() || undefined,
          zone_name: zoneNameDraft.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to create zone");
      }

      setZoneCodeDraft("");
      setZoneNameDraft("");
      setZoneModalOpen(false);
      setSuccess("สร้างโซนสำเร็จ");
      await loadZones();
      await loadMapLayout().catch((loadError) => {
        console.error("Error reloading map layout:", loadError);
      });
    } catch (createError) {
      console.error("Error creating zone:", createError);
      setError(createError instanceof Error ? createError.message : "ไม่สามารถสร้างโซนได้");
    } finally {
      setSaving(false);
    }
  };

  const updateZone = async () => {
    if (!selectedZone) {
      setError("กรุณาเลือกโซนก่อนแก้ไข");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/storage/zones/${selectedZone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_code: zoneCodeEditDraft.trim(),
          zone_name: zoneNameEditDraft.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to update zone");
      }

      setSuccess("บันทึกโซนสำเร็จ");
      await loadZones();
    } catch (updateError) {
      console.error("Error updating zone:", updateError);
      setError(updateError instanceof Error ? updateError.message : "ไม่สามารถแก้ไขโซนได้");
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async () => {
    if (!selectedZone) {
      setError("กรุณาเลือกโซนก่อนลบ");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันลบโซน ${selectedZone.zone_code}? ระบบจะลบช่องย่อยที่ว่างทั้งหมดในโซนนี้ด้วย`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/storage/zones/${selectedZone.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to delete zone");
      }

      setSelectedZoneId("");
      setSelectedSlotId("");
      setSuccess("ลบโซนสำเร็จ");
      await loadZones();
      await loadMapLayout().catch((loadError) => {
        console.error("Error reloading map layout:", loadError);
      });
    } catch (deleteError) {
      console.error("Error deleting zone:", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบโซนได้");
    } finally {
      setSaving(false);
    }
  };

  const createSlot = async () => {
    if (!selectedZone) {
      setError("กรุณาเลือกโซนก่อนเพิ่มช่องย่อย");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/storage/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.id,
          slot_code: slotCodeDraft.trim(),
          slot_name: slotNameDraft.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to create slot");
      }

      setSlotCodeDraft("");
      setSlotNameDraft("");
      setSuccess("สร้างช่องย่อยสำเร็จ");
      await loadZones();
    } catch (createError) {
      console.error("Error creating slot:", createError);
      setError(createError instanceof Error ? createError.message : "ไม่สามารถสร้างช่องย่อยได้");
    } finally {
      setSaving(false);
    }
  };

  const updateSlot = async () => {
    if (!selectedSlot) {
      setError("กรุณาเลือกช่องก่อนแก้ไข");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/storage/slots/${selectedSlot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_code: slotCodeEditDraft.trim(),
          slot_name: slotNameEditDraft.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to update slot");
      }

      setSuccess("บันทึกช่องย่อยสำเร็จ");
      await loadZones();
    } catch (updateError) {
      console.error("Error updating slot:", updateError);
      setError(updateError instanceof Error ? updateError.message : "ไม่สามารถแก้ไขช่องย่อยได้");
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async () => {
    if (!selectedSlot) {
      setError("กรุณาเลือกช่องก่อนลบ");
      return;
    }

    const confirmed = window.confirm(`ยืนยันลบช่อง ${selectedSlot.slot_code}?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/storage/slots/${selectedSlot.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to delete slot");
      }

      setSelectedSlotId("");
      setSuccess("ลบช่องย่อยสำเร็จ");
      await loadZones();
    } catch (deleteError) {
      console.error("Error deleting slot:", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบช่องย่อยได้");
    } finally {
      setSaving(false);
    }
  };

  const isZoneExpanded = (zoneId: string) => expandedZoneIds.includes(zoneId);
  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const expandAll = () => setExpandedZoneIds(filteredZones.map((zone) => zone.id));
  const collapseAll = () => setExpandedZoneIds([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Location Settings</h1>
          <p className="text-sm text-muted-foreground">ตั้งค่าโซนและช่องจัดเก็บ (Master Data)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/locations">ไปหน้า Locations View</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => void loadZones()} disabled={loading || saving}>
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Factory Layout Mapping (8 โซน)</CardTitle>
            <Badge variant="outline">
              แมปแล้ว {REGION_KEYS.filter((key) => Boolean(draftRegionMap[key])).length}/8
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            คลิกพื้นที่ในแผนผัง แล้วเลือกโซนที่ต้องการผูกกับพื้นที่นั้น
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <div className="h-[62vh] overflow-auto rounded-md border bg-slate-50 p-3">
                <svg viewBox="0 0 1188 578" className="h-full min-h-[520px] w-full min-w-[900px]">
                  <rect x="20" y="20" width="1148" height="538" rx="18" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                  {floorPreview.map((cell) => (
                    <g
                      key={cell.key}
                      className="cursor-pointer"
                      onClick={() => setActiveRegionKey(cell.key)}
                    >
                      <rect
                        x={cell.x}
                        y={cell.y}
                        width={cell.w}
                        height={cell.h}
                        rx="12"
                        fill={cell.zone ? "#dbeafe" : "#e5e7eb"}
                        stroke={cell.selected ? "#2563eb" : "#94a3b8"}
                        strokeWidth={cell.selected ? 4 : 2}
                        strokeDasharray={cell.zone ? undefined : "7 5"}
                      />
                      <text x={cell.x + 12} y={cell.y + 24} className="fill-slate-700 text-[16px] font-semibold">
                        {cell.key}
                      </text>
                      <text
                        x={cell.x + cell.w / 2}
                        y={cell.y + cell.h / 2 - 8}
                        textAnchor="middle"
                        className="fill-slate-900 text-[18px] font-semibold"
                      >
                        {cell.zone?.zone_code ?? "ยังไม่ผูกโซน"}
                      </text>
                      <text
                        x={cell.x + cell.w / 2}
                        y={cell.y + cell.h / 2 + 16}
                        textAnchor="middle"
                        className="fill-slate-600 text-[12px]"
                      >
                        {cell.zone ? `${cell.slotCount} ช่อง / ${cell.bagCount} เป้` : "คลิกเพื่อเลือกโซน"}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className="space-y-3 xl:col-span-4">
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-sm font-semibold">พื้นที่ที่เลือก: {activeRegionKey}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  โซนปัจจุบัน:{" "}
                  {draftRegionMap[activeRegionKey]
                    ? zonesById.get(draftRegionMap[activeRegionKey])?.zone_code ?? "-"
                    : "ยังไม่ผูก"}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">เลือกโซนที่จะผูก</p>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={activeMappedZoneId}
                  onChange={(event) => assignZoneToActiveRegion(event.target.value)}
                  disabled={saving || mapSaving}
                >
                  <option value="">ยังไม่ผูกโซน</option>
                  {selectableZonesForActiveRegion.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.zone_code} - {zone.zone_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => assignZoneToActiveRegion("")}
                  disabled={saving || mapSaving || !draftRegionMap[activeRegionKey]}
                >
                  ล้างการผูกพื้นที่นี้
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDraftRegionMap(savedRegionMap)}
                  disabled={saving || mapSaving || !mapDirty}
                >
                  ย้อนค่าที่บันทึกแล้ว
                </Button>
              </div>

              <Button onClick={() => void saveMapLayout()} disabled={saving || mapSaving || !mapDirty} className="w-full">
                {mapSaving ? "กำลังบันทึก..." : "บันทึกผังโซน"}
              </Button>

              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">โซนที่ยังไม่ถูกแมป</p>
                {unmappedZones.length === 0 ? (
                  <p className="mt-1 text-xs text-emerald-700">แมปครบทุกโซนแล้ว</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unmappedZones.map((zone) => (
                      <Badge key={zone.id} variant="outline">
                        {zone.zone_code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">โครงสร้างตำแหน่ง (Tree)</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{zones.length} โซน</Badge>

                <Dialog
                  open={zoneModalOpen}
                  onOpenChange={(open) => {
                    if (saving && !open) return;
                    setZoneModalOpen(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={saving || loading} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      เพิ่มโซน
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>เพิ่มโซนใหม่</DialogTitle>
                      <DialogDescription>ระบุรหัสและชื่อโซนเพื่อสร้างพื้นที่จัดเก็บ</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-1">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">รหัสโซน (ไม่บังคับ)</p>
                        <Input
                          value={zoneCodeDraft}
                          onChange={(event) => setZoneCodeDraft(event.target.value.toUpperCase())}
                          placeholder="เช่น Z001"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">ชื่อโซน (ไม่บังคับ)</p>
                        <Input
                          value={zoneNameDraft}
                          onChange={(event) => setZoneNameDraft(event.target.value)}
                          placeholder="เช่น โซนเหล็ก"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setZoneModalOpen(false)} disabled={saving}>
                        ยกเลิก
                      </Button>
                      <Button onClick={() => void createZone()} disabled={saving}>
                        {saving ? "กำลังบันทึก..." : "สร้างโซน"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="ค้นหาโซน/ช่อง"
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={expandAll} disabled={filteredZones.length === 0 || loading || saving}>
                  Expand All
                </Button>
                <Button variant="outline" onClick={collapseAll} disabled={filteredZones.length === 0 || loading || saving}>
                  Collapse All
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-[58vh] pr-3">
              {filteredZones.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่พบข้อมูลโซน/ช่องตามเงื่อนไข</p>
              ) : (
                <div className="space-y-2">
                  {filteredZones.map((zone) => {
                    const selectedZoneRow = selectedZoneId === zone.id;
                    const expanded = isZoneExpanded(zone.id);

                    return (
                      <div key={zone.id} className="rounded-lg border bg-white">
                        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleZoneExpanded(zone.id)}
                            aria-label={expanded ? "ยุบโซน" : "ขยายโซน"}
                          >
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>

                          <button
                            type="button"
                            className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${selectedZoneRow ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-50"}`}
                            onClick={() => {
                              setSelectedZoneId(zone.id);
                              setSelectedSlotId("");
                            }}
                          >
                            <FolderTree className="h-4 w-4" />
                            <span className="truncate font-semibold">{zone.zone_code}</span>
                            <span className="truncate text-muted-foreground">{zone.zone_name}</span>
                          </button>

                          <Badge variant="outline">{zone._count?.slots ?? zone.slots.length} ช่อง</Badge>
                        </div>

                        {expanded ? (
                          <div className="space-y-1 border-t px-2 py-2">
                            {zone.slots.length === 0 ? (
                              <p className="px-2 py-1 text-xs text-muted-foreground">ยังไม่มีช่องในโซนนี้</p>
                            ) : (
                              zone.slots.map((slot) => {
                                const selectedSlotRow = selectedSlotId === slot.id;

                                return (
                                  <div
                                    key={slot.id}
                                    className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-md px-2 py-1 ${selectedSlotRow ? "bg-blue-50" : "hover:bg-slate-50"}`}
                                  >
                                    <button
                                      type="button"
                                      className="flex min-w-0 items-center gap-2 text-left"
                                      onClick={() => {
                                        setSelectedZoneId(zone.id);
                                        setSelectedSlotId(slot.id);
                                      }}
                                    >
                                      <span className="truncate text-sm font-medium">{slot.slot_code}</span>
                                      {slot.slot_name ? <span className="truncate text-xs text-muted-foreground">{slot.slot_name}</span> : null}
                                    </button>

                                    <Badge variant={selectedSlotRow ? "default" : "outline"}>
                                      {slot._count?.bags ?? 0}
                                    </Badge>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-7">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">ตั้งค่าโซน {selectedZone ? `- ${selectedZone.zone_code}` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedZone ? (
                <p className="text-sm text-muted-foreground">กรุณาเลือกโซนจาก panel ซ้ายก่อน</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">รหัสโซน</p>
                      <Input
                        value={zoneCodeEditDraft}
                        onChange={(event) => setZoneCodeEditDraft(event.target.value.toUpperCase())}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">ชื่อโซน</p>
                      <Input
                        value={zoneNameEditDraft}
                        onChange={(event) => setZoneNameEditDraft(event.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => void updateZone()} disabled={saving}>บันทึกโซน</Button>
                    <Button variant="outline" className="text-red-600" onClick={() => void deleteZone()} disabled={saving}>
                      ลบโซน
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">เพิ่มช่องในโซนที่เลือก</h3>
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <Input
                        value={slotCodeDraft}
                        onChange={(event) => setSlotCodeDraft(event.target.value.toUpperCase())}
                        placeholder="รหัสช่อง เช่น A01"
                        disabled={saving}
                      />
                      <Input
                        value={slotNameDraft}
                        onChange={(event) => setSlotNameDraft(event.target.value)}
                        placeholder="ชื่อช่อง (ไม่บังคับ)"
                        disabled={saving}
                      />
                      <Button onClick={() => void createSlot()} disabled={saving || !slotCodeDraft.trim()}>
                        เพิ่มช่อง
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสช่อง</TableHead>
                          <TableHead>ชื่อช่อง</TableHead>
                          <TableHead className="text-right">จำนวนเป้</TableHead>
                          <TableHead className="w-[110px] text-right">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedZone.slots.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              ยังไม่มีช่องในโซนนี้
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedZone.slots.map((slot) => (
                            <TableRow key={slot.id} className={selectedSlotId === slot.id ? "bg-blue-50/50" : ""}>
                              <TableCell className="font-medium">{slot.slot_code}</TableCell>
                              <TableCell>{slot.slot_name || "-"}</TableCell>
                              <TableCell className="text-right">{slot._count?.bags ?? 0}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedSlotId(slot.id)}
                                >
                                  เลือก
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ตั้งค่าช่อง {selectedSlot ? `- ${selectedSlot.slot_code}` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSlot ? (
                <p className="text-sm text-muted-foreground">เลือกช่องจากตารางด้านบนก่อนเพื่อแก้ไข/ลบ</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">รหัสช่อง</p>
                      <Input
                        value={slotCodeEditDraft}
                        onChange={(event) => setSlotCodeEditDraft(event.target.value.toUpperCase())}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">ชื่อช่อง</p>
                      <Input
                        value={slotNameEditDraft}
                        onChange={(event) => setSlotNameEditDraft(event.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => void updateSlot()} disabled={saving}>บันทึกช่อง</Button>
                    <Button variant="outline" className="text-red-600" onClick={() => void deleteSlot()} disabled={saving}>
                      ลบช่อง
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
