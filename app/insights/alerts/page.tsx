"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, RefreshCw, Scale, Truck } from "lucide-react";

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

type AlertSeverity = "critical" | "warning" | "info";

type AlertState = {
  alert_key: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  acknowledged_by_name: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  assigned_at: string | null;
};

type PlannedOverdue = {
  alert_key: string;
  severity: AlertSeverity;
  state: AlertState;
  plan_id: string;
  trip_type: "INBOUND_PURCHASE" | "OUTBOUND_SALE";
  planned_start_at: string;
  overdue_minutes: number;
  vehicle_id: string;
  driver_name: string | null;
  customer_factory: string;
};

type StaleTrip = {
  alert_key: string;
  severity: AlertSeverity;
  state: AlertState;
  trip_id: string;
  status: string;
  vehicle_id: string;
  driver_name: string | null;
  customer_factory: string;
  started_at: string | null;
  elapsed_hours: number;
  updated_at: string;
};

type VarianceAlert = {
  alert_key: string;
  severity: AlertSeverity;
  state: AlertState;
  trip_id: string;
  status: string;
  customer_factory: string;
  partner_name: string | null;
  customer_weight: number;
  our_net_weight: number;
  variance: number;
  variance_pct: number;
  abs_variance_pct: number;
  updated_at: string;
};

type AlertsPayload = {
  generated_at: string;
  thresholds: {
    stale_hours: number;
    plan_grace_minutes: number;
    variance_pct: number;
    lookback_days: number;
  };
  counts: {
    planned_overdue: number;
    stale_trips: number;
    variance_alerts: number;
  };
  severity_counts: {
    critical: number;
    warning: number;
    info: number;
  };
  planned_overdue: PlannedOverdue[];
  stale_trips: StaleTrip[];
  variance_alerts: VarianceAlert[];
};

type AuthUser = {
  id: string;
  employee_code: string;
  display_name: string;
  role: "WORKER" | "OFFICE" | "EXECUTIVE" | "ADMIN";
  is_active: boolean;
};

type AuthContextPayload = {
  current_user: AuthUser | null;
  users: AuthUser[];
};

type ActionType = "ACK" | "UNACK" | "ASSIGN" | "UNASSIGN";

function severityLabel(severity: AlertSeverity): string {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  return "Info";
}

function severityBadgeClass(severity: AlertSeverity): string {
  if (severity === "critical") return "";
  if (severity === "warning") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-slate-300 bg-slate-50 text-slate-600";
}

function severityVariant(severity: AlertSeverity): "destructive" | "outline" {
  if (severity === "critical") return "destructive";
  return "outline";
}

export default function AlertsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<AlertsPayload | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [actionBusyKey, setActionBusyKey] = useState("");
  const [assigneeDraft, setAssigneeDraft] = useState<Record<string, string>>({});

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/insights/alerts", { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Failed to load alerts");
      }
      const data = (await response.json()) as AlertsPayload;
      setPayload(data);
    } catch (loadError) {
      console.error("Failed to load alerts:", loadError);
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดแจ้งเตือนได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/context", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as AuthContextPayload;
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (loadError) {
      console.error("Failed to load users for alert assignment:", loadError);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    void loadUsers();
  }, [loadAlerts, loadUsers]);

  const allAlertRows = useMemo(
    () =>
      [
        ...(payload?.planned_overdue ?? []),
        ...(payload?.stale_trips ?? []),
        ...(payload?.variance_alerts ?? []),
      ] as Array<{ alert_key: string; state: AlertState }>,
    [payload]
  );

  useEffect(() => {
    if (allAlertRows.length === 0) return;
    setAssigneeDraft((prev) => {
      const next = { ...prev };
      for (const row of allAlertRows) {
        next[row.alert_key] = row.state.assigned_user_id || "__none__";
      }
      return next;
    });
  }, [allAlertRows]);

  const runAction = useCallback(
    async (alertKey: string, actionType: ActionType, assignedUserId?: string) => {
      try {
        setActionBusyKey(`${alertKey}:${actionType}`);
        setError("");

        const response = await fetch("/api/insights/alerts/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alert_key: alertKey,
            action_type: actionType,
            ...(assignedUserId ? { assigned_user_id: assignedUserId } : {}),
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "ไม่สามารถบันทึกสถานะแจ้งเตือนได้");
        }

        await loadAlerts();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "ไม่สามารถบันทึกสถานะแจ้งเตือนได้");
      } finally {
        setActionBusyKey("");
      }
    },
    [loadAlerts]
  );

  const totalAlerts = useMemo(() => {
    if (!payload) return 0;
    return payload.counts.planned_overdue + payload.counts.stale_trips + payload.counts.variance_alerts;
  }, [payload]);

  const renderStateCell = (state: AlertState) => {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={state.acknowledged ? "secondary" : "outline"}>
            {state.acknowledged ? "รับทราบแล้ว" : "ยังไม่รับทราบ"}
          </Badge>
          {state.assigned_user_name ? (
            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
              มอบหมาย: {state.assigned_user_name}
            </Badge>
          ) : (
            <Badge variant="outline">ยังไม่มอบหมาย</Badge>
          )}
        </div>
        {state.acknowledged_at ? (
          <p className="text-xs text-muted-foreground">
            รับทราบโดย {state.acknowledged_by_name || "-"} เมื่อ{" "}
            {new Date(state.acknowledged_at).toLocaleString("th-TH")}
          </p>
        ) : null}
      </div>
    );
  };

  const renderActionCell = (alertKey: string, state: AlertState, goToHref: string, goToLabel: string) => {
    const draftValue = assigneeDraft[alertKey] || "__none__";
    const isBusy = actionBusyKey.startsWith(`${alertKey}:`);

    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button asChild size="xs" variant="outline">
          <Link href={goToHref}>{goToLabel}</Link>
        </Button>
        <Button
          type="button"
          size="xs"
          variant={state.acknowledged ? "secondary" : "outline"}
          disabled={isBusy}
          onClick={() => void runAction(alertKey, state.acknowledged ? "UNACK" : "ACK")}
        >
          {state.acknowledged ? "ยกเลิกรับทราบ" : "รับทราบ"}
        </Button>
        <Select
          value={draftValue}
          onValueChange={(value) => setAssigneeDraft((prev) => ({ ...prev, [alertKey]: value }))}
          disabled={isBusy}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs">
            <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">ไม่ระบุผู้รับผิดชอบ</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={isBusy}
          onClick={() =>
            void runAction(
              alertKey,
              draftValue === "__none__" ? "UNASSIGN" : "ASSIGN",
              draftValue === "__none__" ? undefined : draftValue
            )
          }
        >
          บันทึกผู้รับผิดชอบ
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">แจ้งเตือนที่ต้องจัดการทันทีสำหรับทีมปฏิบัติการ</p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void loadAlerts()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">แจ้งเตือนทั้งหมด</p>
            <p className="text-2xl font-semibold tabular-nums">{totalAlerts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Critical</p>
            <p className="text-2xl font-semibold tabular-nums text-red-700">
              {payload?.severity_counts.critical ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Warning</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-700">
              {payload?.severity_counts.warning ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Info</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-600">
              {payload?.severity_counts.info ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">แผนล่วงหน้าเกินเวลาเปิดงาน</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Grace {payload?.thresholds.plan_grace_minutes ?? 30} นาที
              </Badge>
              <Button asChild size="sm" variant="outline">
                <Link href="/operations/trip-plans">ไปหน้า Trip Plans</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payload && payload.planned_overdue.length === 0 ? (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              ไม่มีแผนเกินเวลา
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ระดับ</TableHead>
                    <TableHead>แผน</TableHead>
                    <TableHead>รถ/คนขับ</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead className="text-right">เกินเวลา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payload?.planned_overdue ?? []).map((row) => (
                    <TableRow key={row.alert_key}>
                      <TableCell>
                        <Badge variant={severityVariant(row.severity)} className={severityBadgeClass(row.severity)}>
                          {severityLabel(row.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{new Date(row.planned_start_at).toLocaleString("th-TH")}</div>
                        <div className="text-xs text-muted-foreground">{row.plan_id.slice(-8).toUpperCase()}</div>
                      </TableCell>
                      <TableCell>
                        <div>{row.vehicle_id || "-"}</div>
                        <div className="text-xs text-muted-foreground">{row.driver_name || "-"}</div>
                      </TableCell>
                      <TableCell>{row.customer_factory || "-"}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-700">
                        {Math.max(0, Math.round(row.overdue_minutes))} นาที
                      </TableCell>
                      <TableCell>{renderStateCell(row.state)}</TableCell>
                      <TableCell className="text-right">
                        {renderActionCell(row.alert_key, row.state, "/operations/trip-plans", "เปิดแผน")}
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
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">เที่ยวใช้งานรถเกิน SLA</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">SLA {payload?.thresholds.stale_hours ?? 8} ชั่วโมง</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href="/operations/weighbridge">ไปหน้า Weighbridge</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payload && payload.stale_trips.length === 0 ? (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              ไม่มีเที่ยวค้างเกินเวลา
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ระดับ</TableHead>
                    <TableHead>เที่ยว</TableHead>
                    <TableHead>รถ/คนขับ</TableHead>
                    <TableHead>ปลายทาง</TableHead>
                    <TableHead className="text-right">ผ่านไป</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payload?.stale_trips ?? []).map((row) => (
                    <TableRow key={row.alert_key}>
                      <TableCell>
                        <Badge variant={severityVariant(row.severity)} className={severityBadgeClass(row.severity)}>
                          {severityLabel(row.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.trip_id.slice(-8).toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">{row.status}</div>
                      </TableCell>
                      <TableCell>
                        <div>{row.vehicle_id || "-"}</div>
                        <div className="text-xs text-muted-foreground">{row.driver_name || "-"}</div>
                      </TableCell>
                      <TableCell>{row.customer_factory || "-"}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-700">
                        {row.elapsed_hours.toLocaleString("th-TH", { maximumFractionDigits: 1 })} ชม.
                      </TableCell>
                      <TableCell>{renderStateCell(row.state)}</TableCell>
                      <TableCell className="text-right">
                        {renderActionCell(row.alert_key, row.state, `/operations/trips?trip=${row.trip_id}`, "เปิดงาน")}
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
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">น้ำหนักต่างเกินเกณฑ์</CardTitle>
            <Badge variant="outline">
              เกณฑ์ {payload?.thresholds.variance_pct ?? 1.5}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {payload && payload.variance_alerts.length === 0 ? (
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              ไม่พบเที่ยวที่น้ำหนักต่างเกินเกณฑ์
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ระดับ</TableHead>
                    <TableHead>เที่ยว</TableHead>
                    <TableHead>คู่ค้า/ปลายทาง</TableHead>
                    <TableHead className="text-right">น้ำหนักลูกค้า</TableHead>
                    <TableHead className="text-right">น้ำหนักเรา</TableHead>
                    <TableHead className="text-right">ต่าง</TableHead>
                    <TableHead className="text-right">% ต่าง</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payload?.variance_alerts ?? []).map((row) => (
                    <TableRow key={row.alert_key}>
                      <TableCell>
                        <Badge variant={severityVariant(row.severity)} className={severityBadgeClass(row.severity)}>
                          {severityLabel(row.severity)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.trip_id.slice(-8).toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">{row.status}</div>
                      </TableCell>
                      <TableCell>
                        <div>{row.partner_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{row.customer_factory || "-"}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.customer_weight.toLocaleString("th-TH")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.our_net_weight.toLocaleString("th-TH")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.variance.toLocaleString("th-TH")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-orange-700">
                        {row.abs_variance_pct.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%
                      </TableCell>
                      <TableCell>{renderStateCell(row.state)}</TableCell>
                      <TableCell className="text-right">
                        {renderActionCell(row.alert_key, row.state, `/operations/trips?trip=${row.trip_id}`, "ตรวจสอบ")}
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
        <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            อัปเดตล่าสุด: {payload ? new Date(payload.generated_at).toLocaleString("th-TH") : "-"}
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4" />
              SLA เที่ยวค้าง
            </span>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-4 w-4" />
              แผนล่วงหน้า
            </span>
            <span className="inline-flex items-center gap-1">
              <Scale className="h-4 w-4" />
              Variance
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
