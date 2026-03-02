"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Scale, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { STATUS_LABELS } from "../trips/constants";

type TripRow = {
  id: string;
  vehicle_id: string;
  driver_name: string | null;
  customer_factory: string;
  trip_type: "INBOUND_PURCHASE" | "OUTBOUND_SALE";
  status: keyof typeof STATUS_LABELS;
  initial_weight: number;
  loaded_weight_in: number;
  empty_weight_after_unload: number;
  our_net_weight: number;
  inbound_removed_at?: string | null;
  updated_at: string;
  partner?: {
    id: string;
    name: string;
    factory_name?: string | null;
  } | null;
};

type TripPlanRow = {
  id: string;
  trip_type: "INBOUND_PURCHASE" | "OUTBOUND_SALE";
  planned_start_at: string;
  vehicle_id: string;
  driver_name?: string | null;
  customer_factory: string;
  status: "DRAFT" | "SCHEDULED" | "OPENED" | "CANCELLED";
  opened_trip_id?: string | null;
  partner?: {
    id: string;
    name: string;
    factory_name?: string | null;
  } | null;
};

export default function WeighbridgePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [readyPlans, setReadyPlans] = useState<TripPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingPlanId, setOpeningPlanId] = useState("");
  const [error, setError] = useState("");

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/trips?scope=active&page=1&pageSize=200", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load trips");
      const payload = (await response.json()) as { items?: TripRow[] } | TripRow[];
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.items)
          ? payload.items
          : [];
      setTrips(rows);
    } catch (fetchError) {
      console.error("Error loading weighbridge trips:", fetchError);
      setError("ไม่สามารถโหลดข้อมูล Weighbridge ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReadyPlans = useCallback(async () => {
    try {
      const response = await fetch("/api/trip-plans?ready=true&limit=20", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as TripPlanRow[];
      setReadyPlans(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      console.error("Error loading ready trip plans:", fetchError);
    }
  }, []);

  const openPlannedTrip = useCallback(
    async (planId: string) => {
      try {
        setOpeningPlanId(planId);
        setError("");
        const response = await fetch(`/api/trip-plans/${planId}/open`, { method: "POST" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "ไม่สามารถเปิดงานจากแผนได้");
        }
        const payload = (await response.json()) as { trip?: { id: string } };
        const tripId = payload.trip?.id;
        await Promise.all([loadTrips(), loadReadyPlans()]);
        if (tripId) {
          router.push(`/operations/trips?trip=${tripId}`);
        }
      } catch (openError) {
        console.error("Error opening planned trip:", openError);
        setError(openError instanceof Error ? openError.message : "ไม่สามารถเปิดงานจากแผนได้");
      } finally {
        setOpeningPlanId("");
      }
    },
    [loadReadyPlans, loadTrips, router]
  );

  useEffect(() => {
    void loadTrips();
    void loadReadyPlans();
  }, [loadReadyPlans, loadTrips]);

  const inboundTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.trip_type === "INBOUND_PURCHASE")
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)),
    [trips]
  );

  const queueTrips = inboundTrips.filter((trip) => !trip.inbound_removed_at);
  const pendingLoadedInCount = queueTrips.filter((trip) => {
    const needInboundWeight = (Number(trip.initial_weight) || 0) > 0;
    return needInboundWeight && (Number(trip.loaded_weight_in) || 0) <= 0;
  }).length;
  const readyToContinueCount = queueTrips.length - pendingLoadedInCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weighbridge</h1>
          <p className="text-sm text-muted-foreground">คิวหน้างานสำหรับเปิดงานและติดตามสถานะชั่งแบบย่อ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/operations/trips">ไปหน้า Trips</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void Promise.all([loadTrips(), loadReadyPlans()])}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">งานล่วงหน้าพร้อมเปิด</CardTitle>
            <Badge variant="outline">{readyPlans.length} งาน</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {readyPlans.length === 0 ? (
            <div className="flex min-h-20 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              ยังไม่มีงานล่วงหน้าที่ถึงเวลาเปิด
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลานัดหมาย</TableHead>
                    <TableHead>รถ/คนขับ</TableHead>
                    <TableHead>คู่ค้า/ปลายทาง</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="font-medium">{new Date(plan.planned_start_at).toLocaleString("th-TH")}</div>
                        <div className="text-xs text-muted-foreground">{plan.id.slice(-8).toUpperCase()}</div>
                      </TableCell>
                      <TableCell>
                        <div>{plan.vehicle_id || "-"}</div>
                        <div className="text-xs text-muted-foreground">{plan.driver_name || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div>{plan.partner?.factory_name || plan.partner?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{plan.customer_factory || "-"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={openingPlanId === plan.id}
                            onClick={() => void openPlannedTrip(plan.id)}
                          >
                            {openingPlanId === plan.id ? "กำลังเปิด..." : "เปิดงาน"}
                          </Button>
                          <Button asChild type="button" size="sm" variant="ghost">
                            <Link href="/operations/trip-plans">ดูแผน</Link>
                          </Button>
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

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">เที่ยว Inbound ในคิว</p>
            <p className="text-2xl font-semibold tabular-nums">{queueTrips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">รอชั่งรถขาเข้า</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-600">{pendingLoadedInCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">พร้อมทำขั้นตอนถัดไป</p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600">{Math.max(readyToContinueCount, 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">คิว Weighbridge (เปิดงานผ่าน Trips)</CardTitle>
        </CardHeader>
        <CardContent>
          {queueTrips.length === 0 ? (
            <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              <Scale className="mb-2 h-5 w-5" />
              ไม่มีเที่ยวตามเงื่อนไข
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เที่ยว</TableHead>
                    <TableHead>รถ/คนขับ</TableHead>
                    <TableHead>คู่ค้า/โรงงาน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>อัปเดตล่าสุด</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueTrips.map((trip) => {
                    const loaded = Number(trip.loaded_weight_in) || 0;
                    const needInboundWeight = (Number(trip.initial_weight) || 0) > 0;
                    const needsAction = needInboundWeight && loaded <= 0;

                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="font-semibold">{trip.id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell>
                          <div>{trip.vehicle_id || "-"}</div>
                          <div className="text-xs text-muted-foreground">{trip.driver_name || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div>{trip.partner?.factory_name || trip.partner?.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{trip.customer_factory || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline">{STATUS_LABELS[trip.status] ?? trip.status}</Badge>
                            {trip.inbound_removed_at ? (
                              <span className="text-xs text-amber-600">นำออกจากคิว Inbound</span>
                            ) : null}
                            {needsAction ? <span className="text-xs text-amber-600">รอกรอกน้ำหนักขาเข้า</span> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(trip.updated_at).toLocaleString("th-TH")}
                        </TableCell>
                        <TableCell>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                          >
                            <Link href={`/operations/trips?trip=${trip.id}`}>เปิดใน Trips</Link>
                          </Button>
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

      <Card>
        <CardContent className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
          <Truck className="h-4 w-4" />
          หน้านี้ใช้สำหรับ monitor คิวและเปิดงานเท่านั้น ส่วนการกรอก/แก้ข้อมูลหลักให้ทำในหน้า Trips
        </CardContent>
      </Card>
    </div>
  );
}
