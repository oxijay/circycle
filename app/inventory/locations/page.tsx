"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronRight, FolderTree, LayoutGrid, MapPin, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type SlotBag = {
  id: string;
  bag_code: string;
  material: string | null;
  current_weight: number;
  ready_for_sale: boolean;
};

const formatWeight = (value: number): string =>
  Math.round(Number(value) || 0).toLocaleString("th-TH");

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

export default function InventoryLocationsPage() {
  const [zones, setZones] = useState<StorageZone[]>([]);
  const [regionMap, setRegionMap] = useState<Record<MapRegionKey, string>>(createEmptyRegionMap);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [expandedZoneIds, setExpandedZoneIds] = useState<string[]>([]);
  const [slotBags, setSlotBags] = useState<SlotBag[]>([]);
  const [slotBagsLoading, setSlotBagsLoading] = useState(false);
  const [moveBagId, setMoveBagId] = useState("");
  const [moveTargetZoneId, setMoveTargetZoneId] = useState("");
  const [moveTargetSlotId, setMoveTargetSlotId] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [onlyWithBags, setOnlyWithBags] = useState(false);
  const [layoutView, setLayoutView] = useState<"tree" | "map">("map");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setRegionMap(nextMap);
  }, []);

  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [zonesResponse, mapError] = await Promise.all([
        fetch("/api/storage/zones", { cache: "no-store" }),
        loadMapLayout().then(() => null).catch((err) => err),
      ]);
      if (!zonesResponse.ok) throw new Error("Failed to load zones");
      const payload = (await zonesResponse.json()) as StorageZone[];
      const rows = Array.isArray(payload) ? payload : [];

      if (mapError) {
        console.error("Error loading map layout:", mapError);
      }

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
  }, [loadMapLayout]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const selectedSlot = useMemo(
    () => selectedZone?.slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [selectedZone, selectedSlotId]
  );

  const loadSlotBags = useCallback(async (slotId: string) => {
    try {
      setSlotBagsLoading(true);
      const response = await fetch(`/api/bags?slot_id=${encodeURIComponent(slotId)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load bags");
      const payload = (await response.json()) as SlotBag[];
      setSlotBags(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      console.error("Error loading slot bags:", fetchError);
      setError("ไม่สามารถโหลดรายการเป้ในช่องที่เลือกได้");
      setSlotBags([]);
    } finally {
      setSlotBagsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSlotId) {
      setSlotBags([]);
      setMoveBagId("");
      return;
    }
    void loadSlotBags(selectedSlotId);
  }, [selectedSlotId, loadSlotBags]);

  const moveTargetZoneOptions = useMemo(
    () =>
      zones
        .map((zone) => ({
          ...zone,
          slots: zone.slots.filter((slot) => slot.id !== selectedSlotId),
        }))
        .filter((zone) => zone.slots.length > 0),
    [zones, selectedSlotId]
  );

  const moveTargetSlots = useMemo(
    () => moveTargetZoneOptions.find((zone) => zone.id === moveTargetZoneId)?.slots ?? [],
    [moveTargetZoneOptions, moveTargetZoneId]
  );

  useEffect(() => {
    if (!selectedSlotId || moveTargetZoneOptions.length === 0) {
      setMoveTargetZoneId("");
      setMoveTargetSlotId("");
      return;
    }

    const zoneExists = moveTargetZoneOptions.some((zone) => zone.id === moveTargetZoneId);
    const nextZoneId = zoneExists ? moveTargetZoneId : moveTargetZoneOptions[0].id;
    setMoveTargetZoneId(nextZoneId);

    const nextSlots = moveTargetZoneOptions.find((zone) => zone.id === nextZoneId)?.slots ?? [];
    const slotExists = nextSlots.some((slot) => slot.id === moveTargetSlotId);
    setMoveTargetSlotId(slotExists ? moveTargetSlotId : (nextSlots[0]?.id ?? ""));
  }, [selectedSlotId, moveTargetZoneOptions, moveTargetZoneId, moveTargetSlotId]);

  const normalizedSearch = searchDraft.trim().toLowerCase();

  const filteredZones = useMemo(() => {
    const rows = zones.map((zone) => {
      const zoneBags = zone.slots.reduce((sum, slot) => sum + (slot._count?.bags ?? 0), 0);
      const zoneMatches =
        normalizedSearch.length === 0 ||
        zone.zone_code.toLowerCase().includes(normalizedSearch) ||
        zone.zone_name.toLowerCase().includes(normalizedSearch);

      const filteredSlots = zone.slots.filter((slot) => {
        const bags = slot._count?.bags ?? 0;
        if (onlyWithBags && bags <= 0) return false;
        if (normalizedSearch.length === 0) return true;
        const slotName = (slot.slot_name ?? "").toLowerCase();
        return (
          slot.slot_code.toLowerCase().includes(normalizedSearch) ||
          slotName.includes(normalizedSearch)
        );
      });

      const nextSlots = zoneMatches
        ? zone.slots.filter((slot) => {
            const bags = slot._count?.bags ?? 0;
            return !onlyWithBags || bags > 0;
          })
        : filteredSlots;

      return {
        ...zone,
        zoneBags,
        slots: nextSlots,
        zoneMatches,
      };
    });

    return rows.filter((zone) => {
      if (onlyWithBags && zone.zoneBags <= 0) return false;
      if (normalizedSearch.length === 0) return true;
      return zone.zoneMatches || zone.slots.length > 0;
    });
  }, [zones, normalizedSearch, onlyWithBags]);

  const zonesById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone])),
    [zones]
  );

  const fullFactoryMap = useMemo(() => {
    const rows = FLOOR_CELL_LAYOUT.map((cell) => {
      const zoneId = regionMap[cell.key];
      const zone = zoneId ? zonesById.get(zoneId) ?? null : null;
      const slotCount = zone ? (zone._count?.slots ?? zone.slots.length) : 0;
      const bagCount = zone
        ? zone.slots.reduce((sum, slot) => sum + (slot._count?.bags ?? 0), 0)
        : 0;
      const capacityBase = Math.max(slotCount * 4, 1);
      const occupancyPct = zone ? Math.min(100, Math.round((bagCount / capacityBase) * 100)) : 0;
      const tone: "empty" | "low" | "mid" | "high" = !zone
        ? "empty"
        : occupancyPct >= 80
          ? "high"
          : occupancyPct >= 45
            ? "mid"
            : "low";

      return {
        ...cell,
        zone,
        zoneId,
        slotCount,
        bagCount,
        occupancyPct,
        tone,
      };
    });

    const mappedCount = rows.filter((row) => Boolean(row.zone)).length;
    return { rows, mappedCount };
  }, [regionMap, zonesById]);

  const moveBagToSlot = async () => {
    if (!selectedSlot) {
      setError("กรุณาเลือกช่องต้นทางก่อน");
      return;
    }
    if (!moveBagId) {
      setError("กรุณาเลือกเป้ที่ต้องการย้าย");
      return;
    }
    if (!moveTargetSlotId) {
      setError("กรุณาเลือกช่องปลายทาง");
      return;
    }
    if (moveTargetSlotId === selectedSlot.id) {
      setError("ช่องปลายทางต้องไม่ซ้ำกับช่องต้นทาง");
      return;
    }

    const bag = slotBags.find((row) => row.id === moveBagId);
    const targetSlot = moveTargetSlots.find((row) => row.id === moveTargetSlotId);
    const confirmed = window.confirm(
      `ย้ายเป้ ${bag?.bag_code ?? "-"} ไปช่อง ${targetSlot?.slot_code ?? "-"} ใช่หรือไม่?`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const response = await fetch(`/api/bags/${moveBagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_slot_id: moveTargetSlotId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to move bag");
      }

      setMoveBagId("");
      setSuccess("ย้ายเป้สำเร็จ");
      await Promise.all([loadZones(), loadSlotBags(selectedSlot.id)]);
    } catch (moveError) {
      console.error("Error moving bag:", moveError);
      setError(moveError instanceof Error ? moveError.message : "ไม่สามารถย้ายเป้ได้");
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
      {error ? <div className="error-message">{error}</div> : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className={`grid gap-4 ${layoutView === "map" ? "" : "xl:grid-cols-12"}`}>
        <Card className={layoutView === "map" ? "" : "xl:col-span-5"}>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">
                {layoutView === "map" ? "แผนผังพื้นโรงงาน" : "โซนและช่อง"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {layoutView === "map" ? (
                  <Badge variant="outline">{fullFactoryMap.mappedCount}/8 โซนที่แมปแล้ว</Badge>
                ) : null}
                <Badge variant="secondary">{zones.length} โซน</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="ค้นหาโซน/ช่อง"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={layoutView === "tree" ? "secondary" : "outline"}
                    onClick={() => setLayoutView("tree")}
                    disabled={loading || saving}
                    className="gap-2"
                  >
                    <FolderTree className="h-4 w-4" />
                    Tree
                  </Button>
                  <Button
                    variant={layoutView === "map" ? "secondary" : "outline"}
                    onClick={() => setLayoutView("map")}
                    disabled={loading || saving}
                    className="gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Map
                  </Button>
                </div>
              </div>

              {layoutView === "tree" ? (
                <div className="grid gap-2 md:grid-cols-[auto_auto]">
                <Button
                  variant="outline"
                  onClick={expandAll}
                  disabled={filteredZones.length === 0 || loading || saving}
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  onClick={collapseAll}
                  disabled={filteredZones.length === 0 || loading || saving}
                >
                  Collapse All
                </Button>
                </div>
              ) : null}

              {layoutView === "tree" ? (
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={onlyWithBags}
                    onChange={(event) => setOnlyWithBags(event.target.checked)}
                  />
                  แสดงเฉพาะโซน/ช่องที่มีเป้ค้าง
                </label>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            {layoutView === "tree" ? (
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

                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{zone._count?.slots ?? zone.slots.length} ช่อง</Badge>
                              <Badge variant="secondary">{zone.zoneBags} เป้</Badge>
                            </div>
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
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="truncate text-sm font-medium">{slot.slot_code}</span>
                                        {slot.slot_name ? (
                                          <span className="truncate text-xs text-muted-foreground">{slot.slot_name}</span>
                                        ) : null}
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
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border bg-slate-50/70 p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                      ว่าง/เบา
                    </Badge>
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                      ใกล้แน่น
                    </Badge>
                    <Badge variant="destructive">แน่น/ต้องติดตาม</Badge>
                    <Badge variant="outline">สีเทา = ยังไม่ผูกโซน</Badge>
                  </div>

                  <div className="h-[72vh] overflow-auto rounded-md border bg-white">
                    <svg viewBox="0 0 1188 578" className="h-full min-h-[560px] w-full min-w-[900px]">
                      <rect x="20" y="20" width="1148" height="538" rx="18" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />

                      {fullFactoryMap.rows.map((cell) => {
                        const selected = cell.zone?.id === selectedZoneId;
                        const fill =
                          cell.tone === "high"
                            ? "#fecaca"
                            : cell.tone === "mid"
                              ? "#fde68a"
                              : cell.tone === "low"
                                ? "#bbf7d0"
                                : "#e5e7eb";
                        const stroke = selected ? "#2563eb" : "#94a3b8";
                        const strokeWidth = selected ? 4 : 2;

                        return (
                          <g
                            key={cell.key}
                            className="cursor-pointer"
                            onClick={() => {
                              if (cell.zone?.id) {
                                setSelectedZoneId(cell.zone.id);
                                setSelectedSlotId("");
                              } else {
                                setSelectedZoneId("");
                                setSelectedSlotId("");
                              }
                            }}
                          >
                            <rect
                              x={cell.x}
                              y={cell.y}
                              width={cell.w}
                              height={cell.h}
                              rx="12"
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={strokeWidth}
                              strokeDasharray={cell.zone ? undefined : "7 5"}
                            />
                            <text
                              x={cell.x + 12}
                              y={cell.y + 24}
                              className="fill-slate-700 text-[16px] font-semibold"
                            >
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
                              {cell.zone ? `${cell.slotCount} ช่อง / ${cell.bagCount} เป้` : "คลิกตั้งค่าที่ Location Settings"}
                            </text>
                            {cell.zone ? (
                              <text
                                x={cell.x + cell.w / 2}
                                y={cell.y + cell.h - 14}
                                textAnchor="middle"
                                className="fill-slate-600 text-[11px]"
                              >
                                ใช้งาน {cell.occupancyPct}%
                              </text>
                            ) : null}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className={layoutView === "map" ? "grid gap-4 xl:grid-cols-2" : "space-y-4 xl:col-span-7"}>
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">
                รายละเอียดโซน {selectedZone ? `- ${selectedZone.zone_code}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedZone ? (
                <p className="text-sm text-muted-foreground">กรุณาคลิกเลือกโซนจาก panel ซ้ายก่อน</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border bg-muted/20 px-3 py-2">
                      <p className="text-xs text-muted-foreground">รหัสโซน</p>
                      <p className="text-sm font-semibold">{selectedZone.zone_code}</p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-3 py-2">
                      <p className="text-xs text-muted-foreground">ชื่อโซน</p>
                      <p className="text-sm font-semibold">{selectedZone.zone_name}</p>
                    </div>
                    <div className="rounded-md border bg-muted/20 px-3 py-2">
                      <p className="text-xs text-muted-foreground">จำนวนช่อง</p>
                      <p className="text-sm font-semibold">{selectedZone._count?.slots ?? selectedZone.slots.length}</p>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสช่อง</TableHead>
                          <TableHead>ชื่อช่อง</TableHead>
                          <TableHead className="text-right">จำนวนเป้</TableHead>
                          <TableHead className="w-[120px] text-right">จัดการ</TableHead>
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
              <CardTitle className="text-lg">รายการเป้ในช่อง {selectedSlot ? `- ${selectedSlot.slot_code}` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSlot ? (
                <p className="text-sm text-muted-foreground">เลือกช่องจากตารางด้านบนก่อนเพื่อดูรายการเป้</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสเป้</TableHead>
                          <TableHead>ชนิด</TableHead>
                          <TableHead className="text-right">น้ำหนัก</TableHead>
                          <TableHead className="text-center">สถานะขาย</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slotBags.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              {slotBagsLoading ? "กำลังโหลด..." : "ยังไม่มีเป้ในช่องนี้"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          slotBags.map((bag) => (
                            <TableRow key={bag.id}>
                              <TableCell className="font-medium">{bag.bag_code}</TableCell>
                              <TableCell>{bag.material || "-"}</TableCell>
                              <TableCell className="text-right">{formatWeight(bag.current_weight)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={bag.ready_for_sale ? "default" : "outline"}>
                                  {bag.ready_for_sale ? "พร้อมขาย" : "รอคัดแยก"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <ArrowRightLeft className="h-4 w-4" />
                      ย้ายเป้ไปช่องอื่น
                    </h3>

                    <div className="grid gap-2 md:grid-cols-3">
                      <select
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        value={moveBagId}
                        onChange={(event) => setMoveBagId(event.target.value)}
                        disabled={saving || slotBags.length === 0}
                      >
                        <option value="">เลือกเป้</option>
                        {slotBags.map((bag) => (
                          <option key={bag.id} value={bag.id}>
                            {bag.bag_code}
                          </option>
                        ))}
                      </select>

                      <select
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        value={moveTargetZoneId}
                        onChange={(event) => setMoveTargetZoneId(event.target.value)}
                        disabled={saving || moveTargetZoneOptions.length === 0}
                      >
                        <option value="">เลือกโซนปลายทาง</option>
                        {moveTargetZoneOptions.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.zone_code} - {zone.zone_name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        value={moveTargetSlotId}
                        onChange={(event) => setMoveTargetSlotId(event.target.value)}
                        disabled={saving || moveTargetSlots.length === 0}
                      >
                        <option value="">เลือกช่องปลายทาง</option>
                        {moveTargetSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.slot_code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      onClick={() => void moveBagToSlot()}
                      disabled={saving || !moveBagId || !moveTargetSlotId}
                    >
                      ย้ายเป้
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
