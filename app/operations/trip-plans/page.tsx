"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type TripType = "INBOUND_PURCHASE" | "OUTBOUND_SALE";
type PartnerType = "SUPPLIER" | "BUYER" | "BOTH";
type TripPlanStatus = "DRAFT" | "SCHEDULED" | "OPENED" | "CANCELLED";

type Partner = {
  id: string;
  name: string;
  factory_name?: string | null;
  partner_type: PartnerType;
};

type VehicleOption = {
  id: string;
  plateNo: string;
  driverName?: string | null;
};

type TripPlanRow = {
  id: string;
  trip_type: TripType;
  planned_start_at: string;
  vehicle_id: string;
  automil_vehicle_id?: string | null;
  driver_name?: string | null;
  partner_id?: string | null;
  customer_factory: string;
  notes?: string | null;
  status: TripPlanStatus;
  opened_trip_id?: string | null;
  opened_at?: string | null;
  created_at: string;
  updated_at: string;
  partner?: {
    id: string;
    name: string;
    factory_name?: string | null;
  } | null;
};

type TripPlanFormState = {
  trip_type: TripType;
  planned_start_at: string;
  automil_vehicle_id: string;
  vehicle_id: string;
  driver_name: string;
  partner_id: string;
  customer_factory: string;
  notes: string;
  status: Extract<TripPlanStatus, "DRAFT" | "SCHEDULED">;
};

const TRIP_TYPE_LABEL: Record<TripType, string> = {
  INBOUND_PURCHASE: "รับเข้า",
  OUTBOUND_SALE: "ส่งขาย",
};

const STATUS_LABEL: Record<TripPlanStatus, string> = {
  DRAFT: "ฉบับร่าง",
  SCHEDULED: "รอเปิดงาน",
  OPENED: "เปิดงานแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
};

function toDatetimeLocal(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function initialFormState(): TripPlanFormState {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setSeconds(0, 0);
  return {
    trip_type: "INBOUND_PURCHASE",
    planned_start_at: toDatetimeLocal(nextHour),
    automil_vehicle_id: "",
    vehicle_id: "",
    driver_name: "",
    partner_id: "",
    customer_factory: "",
    notes: "",
    status: "SCHEDULED",
  };
}

export default function TripPlansPage() {
  const router = useRouter();
  const [tripPlans, setTripPlans] = useState<TripPlanRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<TripPlanFormState>(() => initialFormState());

  const loadTripPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/trip-plans", { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to load trip plans");
      }
      const payload = (await response.json()) as TripPlanRow[];
      setTripPlans(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      console.error("Failed to load trip plans:", loadError);
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดแผนงานได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPartners = useCallback(async () => {
    try {
      const response = await fetch("/api/partners?active=true", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as Partner[];
      setPartners(Array.isArray(payload) ? payload : []);
    } catch (loadError) {
      console.error("Failed to load partners:", loadError);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/automil/vehicles", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { vehicles?: VehicleOption[] };
      setVehicles(Array.isArray(payload.vehicles) ? payload.vehicles : []);
    } catch (loadError) {
      console.error("Failed to load vehicles:", loadError);
    }
  }, []);

  useEffect(() => {
    void loadTripPlans();
    void loadPartners();
    void loadVehicles();
  }, [loadPartners, loadTripPlans, loadVehicles]);

  const filteredPartners = useMemo(() => {
    if (form.trip_type === "INBOUND_PURCHASE") {
      return partners.filter((partner) => partner.partner_type === "SUPPLIER" || partner.partner_type === "BOTH");
    }
    return partners.filter((partner) => partner.partner_type === "BUYER" || partner.partner_type === "BOTH");
  }, [partners, form.trip_type]);

  const sortedPlans = useMemo(() => {
    return [...tripPlans].sort((a, b) => +new Date(a.planned_start_at) - +new Date(b.planned_start_at));
  }, [tripPlans]);

  const vehicleOptionsForSelect = useMemo(() => {
    if (!form.vehicle_id || vehicles.some((vehicle) => vehicle.plateNo === form.vehicle_id)) {
      return vehicles;
    }
    return [
      {
        id: "__legacy_vehicle__",
        plateNo: form.vehicle_id,
        driverName: form.driver_name || null,
      },
      ...vehicles,
    ];
  }, [vehicles, form.vehicle_id, form.driver_name]);

  const selectedVehicleOption = useMemo(() => {
    if (!form.vehicle_id && !form.automil_vehicle_id) return null;
    if (form.automil_vehicle_id) {
      const byId = vehicleOptionsForSelect.find((vehicle) => vehicle.id === form.automil_vehicle_id);
      if (byId) return byId;
    }
    return vehicleOptionsForSelect.find((vehicle) => vehicle.plateNo === form.vehicle_id) || null;
  }, [vehicleOptionsForSelect, form.automil_vehicle_id, form.vehicle_id]);

  const driverOptions = useMemo(() => {
    const names = vehicles
      .map((vehicle) => vehicle.driverName?.trim())
      .filter((name): name is string => Boolean(name));
    if (form.driver_name && !names.includes(form.driver_name)) {
      names.unshift(form.driver_name);
    }
    return Array.from(new Set(names));
  }, [vehicles, form.driver_name]);

  const editable = useMemo(() => {
    if (!editingPlanId) return true;
    const current = tripPlans.find((plan) => plan.id === editingPlanId);
    return current?.status !== "OPENED";
  }, [editingPlanId, tripPlans]);

  const setFromVehicle = (vehicleId: string) => {
    if (vehicleId === "__none__") {
      setForm((prev) => ({
        ...prev,
        automil_vehicle_id: "",
        vehicle_id: "",
      }));
      return;
    }
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) {
      const legacy = vehicleOptionsForSelect.find((item) => item.id === vehicleId);
      if (!legacy) return;
      setForm((prev) => ({
        ...prev,
        automil_vehicle_id: "",
        vehicle_id: legacy.plateNo || prev.vehicle_id,
        driver_name: prev.driver_name || legacy.driverName || "",
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      automil_vehicle_id: vehicle.id,
      vehicle_id: vehicle.plateNo || prev.vehicle_id,
      driver_name: vehicle.driverName || prev.driver_name || "",
    }));
  };

  const startCreate = () => {
    setEditingPlanId(null);
    setFormError("");
    setForm(initialFormState());
  };

  const startEdit = (plan: TripPlanRow) => {
    setEditingPlanId(plan.id);
    setFormError("");
    setForm({
      trip_type: plan.trip_type,
      planned_start_at: toDatetimeLocal(plan.planned_start_at),
      automil_vehicle_id: plan.automil_vehicle_id || "",
      vehicle_id: plan.vehicle_id || "",
      driver_name: plan.driver_name || "",
      partner_id: plan.partner_id || "",
      customer_factory: plan.customer_factory || "",
      notes: plan.notes || "",
      status: plan.status === "DRAFT" ? "DRAFT" : "SCHEDULED",
    });
  };

  const submitForm = async () => {
    setFormError("");
    try {
      setSaving(true);
      const payload = {
        trip_type: form.trip_type,
        planned_start_at: new Date(form.planned_start_at).toISOString(),
        automil_vehicle_id: form.automil_vehicle_id || null,
        vehicle_id: form.vehicle_id.trim(),
        driver_name: form.driver_name.trim() || null,
        partner_id: form.partner_id || null,
        customer_factory: form.customer_factory.trim(),
        notes: form.notes.trim() || null,
        status: form.status,
      };

      const isEdit = Boolean(editingPlanId);
      const response = await fetch(isEdit ? `/api/trip-plans/${editingPlanId}` : "/api/trip-plans", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorPayload.error || "Failed to save trip plan");
      }

      await loadTripPlans();
      startCreate();
    } catch (saveError) {
      console.error("Failed to save trip plan:", saveError);
      setFormError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกแผนงานได้");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId: string) => {
    const confirmed = window.confirm("ยืนยันลบแผนล่วงหน้านี้ใช่ไหม?")
    if (!confirmed) return

    try {
      setSaving(true);
      const response = await fetch(`/api/trip-plans/${planId}`, { method: "DELETE" });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorPayload.error || "Failed to delete trip plan");
      }
      setTripPlans((prev) => prev.filter((plan) => plan.id !== planId));
      if (editingPlanId === planId) startCreate();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ไม่สามารถลบแผนงานได้");
    } finally {
      setSaving(false);
    }
  };

  const openPlan = async (planId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/trip-plans/${planId}/open`, {
        method: "POST",
      });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorPayload.error || "Failed to open trip plan");
      }
      const payload = (await response.json()) as { trip?: { id: string } };
      const tripId = payload.trip?.id;
      await loadTripPlans();
      if (tripId) {
        router.push(`/operations/trips?trip=${tripId}`);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ไม่สามารถเปิดงานจากแผนได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trip Plans</h1>
          <p className="text-sm text-muted-foreground">
            วางแผนงานล่วงหน้า แล้วให้ Weighbridge เปิดงานจริงตามเวลา
          </p>
        </div>
        <Button type="button" variant="outline" onClick={startCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          สร้างแผนใหม่
        </Button>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">รายการแผนล่วงหน้า</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังโหลดข้อมูล...
              </div>
            ) : sortedPlans.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                ยังไม่มีแผนล่วงหน้า
              </div>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เวลานัดหมาย</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>รถ/คนขับ</TableHead>
                      <TableHead>คู่ค้า/ปลายทาง</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div className="font-medium">{new Date(plan.planned_start_at).toLocaleString("th-TH")}</div>
                          <div className="text-xs text-muted-foreground">{plan.id.slice(-8).toUpperCase()}</div>
                        </TableCell>
                        <TableCell>{TRIP_TYPE_LABEL[plan.trip_type]}</TableCell>
                        <TableCell>
                          <div>{plan.vehicle_id || "-"}</div>
                          <div className="text-xs text-muted-foreground">{plan.driver_name || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div>{plan.partner?.factory_name || plan.partner?.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{plan.customer_factory || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={plan.status === "OPENED" ? "default" : "outline"}>
                            {STATUS_LABEL[plan.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {(plan.status === "DRAFT" || plan.status === "SCHEDULED") && !plan.opened_trip_id ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => void openPlan(plan.id)}
                              >
                                เปิดงาน
                              </Button>
                            ) : null}
                            {plan.status !== "OPENED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => startEdit(plan)}
                              >
                                แก้ไข
                              </Button>
                            ) : null}
                            {plan.status !== "OPENED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                disabled={saving}
                                onClick={() => void deletePlan(plan.id)}
                              >
                                ลบแผน
                              </Button>
                            ) : null}
                            {plan.opened_trip_id ? (
                              <Button asChild type="button" size="sm" variant="ghost">
                                <Link href={`/operations/trips?trip=${plan.opened_trip_id}`}>เปิดเที่ยว</Link>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" />
              {editingPlanId ? "แก้ไขแผน" : "สร้างแผนใหม่"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ประเภทเที่ยว</label>
              <Select
                value={form.trip_type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    trip_type: value as TripType,
                    partner_id: "",
                  }))
                }
                disabled={!editable || saving}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="เลือกประเภทเที่ยว" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INBOUND_PURCHASE">รับเข้า</SelectItem>
                  <SelectItem value="OUTBOUND_SALE">ส่งขาย</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">เวลานัดหมาย</label>
              <Input
                type="datetime-local"
                value={form.planned_start_at}
                onChange={(event) => setForm((prev) => ({ ...prev, planned_start_at: event.target.value }))}
                disabled={!editable || saving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ทะเบียนรถ (Fleet)</label>
              <Select
                value={selectedVehicleOption?.id ?? "__none__"}
                onValueChange={(value) => setFromVehicle(value)}
                disabled={!editable || saving}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="เลือกรถ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">เลือกทะเบียนรถ</SelectItem>
                  {vehicleOptionsForSelect.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNo}
                      {vehicle.driverName ? ` (${vehicle.driverName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicles.length === 0 ? (
                <p className="text-xs text-amber-600">ยังไม่พบข้อมูลรถจาก Fleet</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">คนขับ</label>
              <Select
                value={form.driver_name || "__none__"}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, driver_name: value === "__none__" ? "" : value }))
                }
                disabled={!editable || saving}
              >
                <SelectTrigger className="h-10">
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">คู่ค้า</label>
              <Select
                value={form.partner_id || "__none__"}
                onValueChange={(value) => setForm((prev) => ({ ...prev, partner_id: value === "__none__" ? "" : value }))}
                disabled={!editable || saving}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="เลือกคู่ค้า" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">ไม่ระบุ</SelectItem>
                  {filteredPartners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.factory_name || partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">โรงงาน/จุดหมาย</label>
              <Input
                value={form.customer_factory}
                onChange={(event) => setForm((prev) => ({ ...prev, customer_factory: event.target.value }))}
                placeholder="เช่น โรงงานบางปะกง"
                disabled={!editable || saving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">สถานะก่อนเปิดงาน</label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as Extract<TripPlanStatus, "DRAFT" | "SCHEDULED"> }))
                }
                disabled={!editable || saving}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">รอเปิดงาน</SelectItem>
                  <SelectItem value="DRAFT">ฉบับร่าง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">หมายเหตุ</label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="บันทึกข้อมูลเพิ่มเติม"
                disabled={!editable || saving}
              />
            </div>

            {formError ? <div className="text-sm text-red-600">{formError}</div> : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={() => void submitForm()} disabled={saving || !editable}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingPlanId ? "บันทึกการแก้ไข" : "บันทึกแผน"}
              </Button>
              <Button type="button" variant="outline" onClick={startCreate} disabled={saving}>
                ล้างฟอร์ม
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
