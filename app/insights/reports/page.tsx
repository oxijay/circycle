"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReportsPayload = {
  generated_at: string;
  window: {
    days: number;
    from: string;
    to: string;
  };
  trip_performance: {
    total_trips: number;
    closed_trips: number;
    active_trips: number;
    inbound_count: number;
    outbound_count: number;
    avg_cycle_hours: number;
    sla_hours: number;
    sla_met_count: number;
    sla_met_pct: number;
  };
  weighbridge_accuracy: {
    total_with_customer_weight: number;
    threshold_pct: number;
    average_abs_variance_pct: number;
    max_abs_variance_pct: number;
    within_threshold_count: number;
    within_threshold_pct: number;
    top_partners: Array<{
      partner_id: string | null;
      partner_name: string;
      trip_count: number;
      avg_abs_variance_pct: number;
      total_abs_variance_kg: number;
    }>;
  };
  inventory_aging: {
    total_bags: number;
    total_weight: number;
    buckets: Array<{
      label: string;
      count: number;
      total_weight: number;
    }>;
    oldest_bags: Array<{
      bag_id: string;
      bag_code: string;
      material: string | null;
      age_days: number;
      current_weight: number;
      zone_code: string | null;
      slot_code: string | null;
      filled_at: string | null;
    }>;
  };
};

export default function ReportsPage() {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ReportsPayload | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/insights/reports?days=${days}`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load reports");
      }
      const data = (await response.json()) as ReportsPayload;
      setPayload(data);
    } catch (loadError) {
      console.error("Failed to load reports:", loadError);
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดรายงานได้");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const reportRangeLabel = useMemo(() => {
    if (!payload) return `ย้อนหลัง ${days} วัน`;
    return `${new Date(payload.window.from).toLocaleDateString("th-TH")} - ${new Date(payload.window.to).toLocaleDateString("th-TH")}`;
  }, [days, payload]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">รายงานประสิทธิภาพเที่ยว, ความแม่นยำน้ำหนัก และอายุสต็อก</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">ย้อนหลัง 7 วัน</SelectItem>
              <SelectItem value="30">ย้อนหลัง 30 วัน</SelectItem>
              <SelectItem value="90">ย้อนหลัง 90 วัน</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void loadReports()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button asChild type="button" variant="outline">
            <a href={`/api/insights/reports?days=${days}&format=csv`}>Export CSV</a>
          </Button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4">
          <div className="text-sm text-muted-foreground">
            ช่วงข้อมูล: <span className="font-medium text-foreground">{reportRangeLabel}</span>
          </div>
          <Badge variant="outline">
            อัปเดต: {payload ? new Date(payload.generated_at).toLocaleString("th-TH") : "-"}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">จำนวนเที่ยวทั้งหมด</p>
            <p className="text-2xl font-semibold tabular-nums">{payload?.trip_performance.total_trips ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">เที่ยวปิดงานแล้ว</p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-700">
              {payload?.trip_performance.closed_trips ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Cycle time เฉลี่ย</p>
            <p className="text-2xl font-semibold tabular-nums">
              {(payload?.trip_performance.avg_cycle_hours ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ชม.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">SLA ผ่านเกณฑ์</p>
            <p className="text-2xl font-semibold tabular-nums text-blue-700">
              {(payload?.trip_performance.sla_met_pct ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Trip Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">เที่ยว Inbound</p>
                <p className="text-xl font-semibold tabular-nums">{payload?.trip_performance.inbound_count ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">เที่ยว Outbound</p>
                <p className="text-xl font-semibold tabular-nums">{payload?.trip_performance.outbound_count ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">เที่ยว Active</p>
                <p className="text-xl font-semibold tabular-nums">{payload?.trip_performance.active_trips ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">SLA ({payload?.trip_performance.sla_hours ?? 24} ชม.)</p>
                <p className="text-xl font-semibold tabular-nums">
                  {payload?.trip_performance.sla_met_count ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Weighbridge Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">เที่ยวที่มีน้ำหนักลูกค้า</p>
              <p className="text-xl font-semibold tabular-nums">
                {payload?.weighbridge_accuracy.total_with_customer_weight ?? 0}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Avg |%ต่าง|</p>
                <p className="text-xl font-semibold tabular-nums">
                  {(payload?.weighbridge_accuracy.average_abs_variance_pct ?? 0).toLocaleString("th-TH", {
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Max |%ต่าง|</p>
                <p className="text-xl font-semibold tabular-nums text-orange-700">
                  {(payload?.weighbridge_accuracy.max_abs_variance_pct ?? 0).toLocaleString("th-TH", {
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">อยู่ในเกณฑ์ ±{payload?.weighbridge_accuracy.threshold_pct ?? 1.5}%</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-700">
                {(payload?.weighbridge_accuracy.within_threshold_pct ?? 0).toLocaleString("th-TH", {
                  maximumFractionDigits: 1,
                })}
                %
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">คู่ค้าที่มี % ต่างสูงสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {(payload?.weighbridge_accuracy.top_partners ?? []).length === 0 ? (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              ยังไม่มีข้อมูลเพียงพอ
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>คู่ค้า</TableHead>
                    <TableHead className="text-right">จำนวนเที่ยว</TableHead>
                    <TableHead className="text-right">Avg |%ต่าง|</TableHead>
                    <TableHead className="text-right">รวม |น้ำหนักต่าง|</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payload?.weighbridge_accuracy.top_partners ?? []).map((row) => (
                    <TableRow key={row.partner_id || row.partner_name}>
                      <TableCell>{row.partner_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.trip_count.toLocaleString("th-TH")}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.avg_abs_variance_pct.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.total_abs_variance_kg.toLocaleString("th-TH")} กก.
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Inventory Aging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">จำนวนเป้คงเหลือ</p>
                <p className="text-xl font-semibold tabular-nums">{payload?.inventory_aging.total_bags ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">น้ำหนักคงเหลือรวม</p>
                <p className="text-xl font-semibold tabular-nums">
                  {(payload?.inventory_aging.total_weight ?? 0).toLocaleString("th-TH")} กก.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {(payload?.inventory_aging.buckets ?? []).map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="text-sm">{bucket.label}</div>
                  <div className="text-sm tabular-nums text-muted-foreground">
                    {bucket.count.toLocaleString("th-TH")} เป้ / {bucket.total_weight.toLocaleString("th-TH")} กก.
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">เป้ค้างนานที่สุด</CardTitle>
          </CardHeader>
          <CardContent>
            {(payload?.inventory_aging.oldest_bags ?? []).length === 0 ? (
              <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                ไม่พบข้อมูลเป้คงเหลือ
              </div>
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสเป้</TableHead>
                      <TableHead>ชนิด</TableHead>
                      <TableHead className="text-right">อายุ (วัน)</TableHead>
                      <TableHead className="text-right">น้ำหนัก</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.inventory_aging.oldest_bags ?? []).map((bag) => (
                      <TableRow key={bag.bag_id}>
                        <TableCell className="font-medium">{bag.bag_code}</TableCell>
                        <TableCell>{bag.material || "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{bag.age_days.toLocaleString("th-TH")}</TableCell>
                        <TableCell className="text-right tabular-nums">{bag.current_weight.toLocaleString("th-TH")} กก.</TableCell>
                        <TableCell>
                          {bag.zone_code && bag.slot_code ? `${bag.zone_code}/${bag.slot_code}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
