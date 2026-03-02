"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { STATUS_LABELS } from "../trips/constants";

type SummaryTrip = {
  id: string;
  vehicle_id: string;
  customer_factory: string;
  status: keyof typeof STATUS_LABELS;
  customer_reported_weight: number;
  our_net_weight: number;
  weight_variance: number;
  created_at: string;
};

type OperationsSummary = {
  totalCustomerWeight: number;
  totalOurNetWeight: number;
  totalVariance: number;
  varianceAlerts: number;
  todayTrips: SummaryTrip[];
};

const TOLERANCE_PCT = 1.5;

const fmtKg = (value: number): string =>
  `${Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} กก.`;

const fmtPct = (value: number): string => `${value.toFixed(2)}%`;

export default function ReconciliationPage() {
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/operations/summary", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch operations summary");
      const payload = (await response.json()) as OperationsSummary;
      setSummary(payload);
    } catch (fetchError) {
      console.error("Error loading reconciliation summary:", fetchError);
      setError("ไม่สามารถโหลดข้อมูล Reconciliation ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const rows = useMemo(() => {
    const trips = summary?.todayTrips ?? [];
    return trips
      .map((trip) => {
        const customerWeight = Number(trip.customer_reported_weight) || 0;
        const ourWeight = Number(trip.our_net_weight) || 0;
        const varianceKg = Number(trip.weight_variance) || 0;
        const variancePct = customerWeight > 0 ? (varianceKg / customerWeight) * 100 : 0;
        const isAlert = customerWeight > 0 && Math.abs(variancePct) > TOLERANCE_PCT;

        return {
          ...trip,
          customerWeight,
          ourWeight,
          varianceKg,
          variancePct,
          isAlert,
        };
      })
      .filter((trip) => trip.customerWeight > 0 || trip.ourWeight > 0)
      .sort((a, b) => Math.abs(b.varianceKg) - Math.abs(a.varianceKg));
  }, [summary?.todayTrips]);

  const visibleRows = useMemo(
    () => (showAlertsOnly ? rows.filter((row) => row.isAlert) : rows),
    [rows, showAlertsOnly]
  );

  const computedAlerts = rows.filter((row) => row.isAlert).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            เทียบผลชั่งลูกค้า vs ชั่งจริงโรงงาน และแจ้งเตือนเมื่อเกิน {TOLERANCE_PCT}%
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/operations/trips">ไปหน้า Trips</Link>
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void loadSummary()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">เที่ยวที่มีข้อมูลชั่ง</p>
            <p className="text-2xl font-semibold tabular-nums">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">เที่ยวเกิน Tolerance</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-600">
              {summary?.varianceAlerts ?? computedAlerts}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">ชั่งลูกค้ารวม</p>
            <p className="text-xl font-semibold tabular-nums">{fmtKg(summary?.totalCustomerWeight ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">ส่วนต่างรวม</p>
            <p className="text-xl font-semibold tabular-nums">{fmtKg(summary?.totalVariance ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">รายการเทียบผลชั่ง</CardTitle>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showAlertsOnly}
                  onChange={(event) => setShowAlertsOnly(event.target.checked)}
                  className="h-4 w-4"
                />
                แสดงเฉพาะรายการเตือน
              </label>
              <Badge variant="outline">{visibleRows.length} เที่ยว</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleRows.length === 0 ? (
            <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              <AlertTriangle className="mb-2 h-5 w-5" />
              ไม่พบรายการตามเงื่อนไข
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เที่ยว</TableHead>
                    <TableHead>โรงงาน/ลูกค้า</TableHead>
                    <TableHead className="text-right">ชั่งลูกค้า</TableHead>
                    <TableHead className="text-right">ชั่งจริงเรา</TableHead>
                    <TableHead className="text-right">ส่วนต่าง (กก.)</TableHead>
                    <TableHead className="text-right">ส่วนต่าง (%)</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.id.slice(-8).toUpperCase()}</TableCell>
                      <TableCell>{row.customer_factory || "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKg(row.customerWeight)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKg(row.ourWeight)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${row.isAlert ? "text-amber-600" : "text-emerald-600"}`}>
                        {fmtKg(row.varianceKg)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${row.isAlert ? "text-amber-600" : "text-emerald-600"}`}>
                        {row.customerWeight > 0 ? fmtPct(row.variancePct) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABELS[row.status] ?? row.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={row.status === "RECONCILED" || row.status === "PACKING" ? `/operations/inbound/${row.id}` : "/operations/trips"}
                            >
                              เปิดงาน
                            </Link>
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

      <Card>
        <CardContent className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
          <Scale className="h-4 w-4" />
          Tolerance ที่ใช้คัดเตือนในหน้านี้: ±{TOLERANCE_PCT}% ของน้ำหนักลูกค้า
        </CardContent>
      </Card>
    </div>
  );
}
