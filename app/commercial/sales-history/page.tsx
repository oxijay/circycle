"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";

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

type SaleOrder = {
  id: string;
  sale_no: string;
  customer_name: string;
  sold_at: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  allocations: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
};

type StatusFilter = "ALL" | "DRAFT" | "CONFIRMED" | "CANCELLED";

const formatWeight = (value: number): string => Math.round(value || 0).toLocaleString("th-TH");
const formatMoney = (value: number): string =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SalesHistoryPage() {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (q.trim()) query.set("q", q.trim());
      query.set("take", "300");

      const response = await fetch(`/api/sales/orders?${query.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load sale orders");
      }

      const payload = (await response.json()) as SaleOrder[];
      setOrders(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      console.error("Error loading sale summary:", fetchError);
      setError("ไม่สามารถโหลดสรุปการขายได้");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const summary = useMemo(() => {
    const confirmed = filteredOrders.filter((order) => order.status === "CONFIRMED");
    const cancelled = filteredOrders.filter((order) => order.status === "CANCELLED");
    const draft = filteredOrders.filter((order) => order.status === "DRAFT");

    const totalWeight = confirmed.reduce((sum, order) => {
      const orderWeight = order.allocations.reduce((inner, item) => inner + (Number(item.quantity) || 0), 0);
      return sum + orderWeight;
    }, 0);

    const totalAmount = confirmed.reduce((sum, order) => {
      const orderAmount = order.allocations.reduce((inner, item) => inner + (Number(item.total_price) || 0), 0);
      return sum + orderAmount;
    }, 0);

    return {
      total: filteredOrders.length,
      confirmed: confirmed.length,
      cancelled: cancelled.length,
      draft: draft.length,
      totalWeight,
      totalAmount,
    };
  }, [filteredOrders]);

  const cancelOrder = async (order: SaleOrder) => {
    if (order.status !== "CONFIRMED") return;

    const confirmed = window.confirm(`ยืนยันยกเลิกใบขาย ${order.sale_no} ?`);
    if (!confirmed) return;

    const note = window.prompt("เหตุผลที่ยกเลิก (ไม่บังคับ):", "");
    if (note === null) return;

    try {
      setCancellingOrderId(order.id);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/sales/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to cancel sale order");
      }

      await loadOrders();
      setSuccess(`ยกเลิกใบขาย ${order.sale_no} และคืนสต๊อกเรียบร้อย`);
    } catch (cancelError) {
      console.error("Error cancelling sale order from summary:", cancelError);
      setError(cancelError instanceof Error ? cancelError.message : "ไม่สามารถยกเลิกใบขายได้");
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ประวัติการขาย</h1>
          <p className="text-sm text-muted-foreground">สรุปยอดขายและสถานะใบขายทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/commercial/sales">ไปหน้า Sales Dispatch</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void loadOrders()}
            disabled={loading || Boolean(cancellingOrderId)}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={qDraft}
                onChange={(event) => setQDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setQ(qDraft.trim());
                  }
                }}
                className="!pl-10"
                placeholder="ค้นหาเลขที่ใบขาย / ชื่อลูกค้า / รหัสเป้"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">จำนวนบิล</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">ยืนยันแล้ว</p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">ยกเลิกแล้ว</p>
            <p className="text-2xl font-semibold tabular-nums text-amber-600">{summary.cancelled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Draft</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">น้ำหนักรวม (CONFIRMED)</p>
            <p className="text-2xl font-semibold tabular-nums">{formatWeight(summary.totalWeight)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">มูลค่ารวม (CONFIRMED)</p>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(summary.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl">รายการใบขาย</CardTitle>
            <Badge variant="outline">{filteredOrders.length} ใบ</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลใบขายตามเงื่อนไขที่เลือก</p>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่ใบขาย</TableHead>
                    <TableHead>วันที่ขาย</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จำนวนรายการ</TableHead>
                    <TableHead className="text-right">น้ำหนักรวม</TableHead>
                    <TableHead className="text-right">มูลค่ารวม</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isCancelling = cancellingOrderId === order.id;
                    const totalWeight = order.allocations.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                    const totalAmount = order.allocations.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-semibold">{order.sale_no}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(order.sold_at).toLocaleString("th-TH")}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === "CONFIRMED" ? "default" : order.status === "CANCELLED" ? "secondary" : "outline"}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{order.allocations.length}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatWeight(totalWeight)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(totalAmount)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/commercial/sales-history/${order.id}`}>รายละเอียด</Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => void cancelOrder(order)}
                              disabled={order.status !== "CONFIRMED" || isCancelling || loading}
                            >
                              ยกเลิก
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
