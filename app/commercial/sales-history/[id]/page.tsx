"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SaleOrderDetail = {
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
    material: string | null;
    bag: {
      id: string;
      bag_code: string;
      material: string | null;
      current_weight?: number;
      status?: string;
    };
  }>;
};

const formatWeight = (value: number): string => Math.round(value || 0).toLocaleString("th-TH");
const formatMoney = (value: number): string =>
  Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SaleOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id ?? "");

  const [order, setOrder] = useState<SaleOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/sales/orders/${orderId}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to load sale order");
      }

      const payload = (await response.json()) as SaleOrderDetail;
      setOrder(payload);
    } catch (fetchError) {
      console.error("Error loading sale order detail:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดรายละเอียดใบขายได้");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const totals = useMemo(() => {
    const rows = order?.allocations ?? [];
    const totalWeight = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const totalAmount = rows.reduce((sum, row) => sum + (Number(row.total_price) || 0), 0);
    return { totalWeight, totalAmount };
  }, [order?.allocations]);

  const cancelOrder = async () => {
    if (!order || order.status !== "CONFIRMED") return;

    const confirmed = window.confirm(`ยืนยันยกเลิกใบขาย ${order.sale_no} ?`);
    if (!confirmed) return;

    const note = window.prompt("เหตุผลที่ยกเลิก (ไม่บังคับ):", "");
    if (note === null) return;

    try {
      setProcessing(true);
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

      const payload = (await response.json()) as SaleOrderDetail;
      setOrder(payload);
      setSuccess(`ยกเลิกใบขาย ${payload.sale_no} และคืนสต๊อกเรียบร้อย`);
    } catch (cancelError) {
      console.error("Error cancelling sale order:", cancelError);
      setError(cancelError instanceof Error ? cancelError.message : "ไม่สามารถยกเลิกใบขายได้");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">รายละเอียดใบขาย</h1>
          <p className="text-sm text-muted-foreground">ตรวจสอบรายการและสถานะการตัดสต๊อก</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/commercial/sales-history">
              <ArrowLeft className="h-4 w-4" />
              กลับหน้าประวัติการขาย
            </Link>
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void loadOrder()} disabled={loading || processing}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

      {!order && !loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">ไม่พบข้อมูลใบขาย</p>
            <Button asChild variant="outline" className="mt-3">
              <Link href="/commercial/sales-history">กลับหน้าประวัติการขาย</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {order ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">ข้อมูลใบขาย</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">เลขที่ใบขาย</p>
                  <p className="text-lg font-semibold">{order.sale_no}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ลูกค้า</p>
                  <p className="text-lg">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">วันที่ขาย</p>
                  <p className="text-lg">{new Date(order.sold_at).toLocaleString("th-TH")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">สถานะ</p>
                  <div className="pt-1">
                    <Badge variant={order.status === "CONFIRMED" ? "default" : order.status === "CANCELLED" ? "secondary" : "outline"}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-sm text-muted-foreground">น้ำหนักรวม (กก.)</p>
                  <p className="text-3xl font-semibold tabular-nums">{formatWeight(totals.totalWeight)}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-sm text-muted-foreground">มูลค่ารวม</p>
                  <p className="text-3xl font-semibold tabular-nums">{formatMoney(totals.totalAmount)}</p>
                </div>
              </div>

              {order.status === "CONFIRMED" ? (
                <Button type="button" variant="destructive" onClick={() => void cancelOrder()} disabled={processing || loading}>
                  ยกเลิกใบขายและคืนสต๊อก
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">รายการที่ขาย</CardTitle>
                <Badge variant="outline">{order.allocations.length} รายการ</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {order.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีรายการในใบขายนี้</p>
              ) : (
                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสเป้</TableHead>
                        <TableHead>ชนิด</TableHead>
                        <TableHead className="text-right">ปริมาณขาย</TableHead>
                        <TableHead className="text-right">ราคา/กก.</TableHead>
                        <TableHead className="text-right">มูลค่า</TableHead>
                        <TableHead className="text-right">คงเหลือล่าสุด</TableHead>
                        <TableHead>สถานะเป้ล่าสุด</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.allocations.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold">{item.bag?.bag_code || "-"}</TableCell>
                          <TableCell>{item.material || item.bag?.material || "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatWeight(Number(item.quantity) || 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(Number(item.unit_price) || 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(Number(item.total_price) || 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatWeight(Number(item.bag?.current_weight) || 0)}</TableCell>
                          <TableCell>{item.bag?.status || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
