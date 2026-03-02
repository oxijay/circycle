"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, ShoppingBasket, X } from "lucide-react";

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

type SellableBag = {
  id: string;
  bag_code: string;
  material: string | null;
  current_weight: number;
  storage_slot?: {
    id: string;
    slot_code: string;
    zone: {
      id: string;
      zone_code: string;
    };
  } | null;
};

type BuyerPartner = {
  id: string;
  partner_code: string | null;
  name: string;
  factory_name: string | null;
};

type SaleOrderCreateResponse = {
  sale_no: string;
};

type CartItem = {
  bag_id: string;
  bag_code: string;
  material: string | null;
  quantity: number;
};

const formatWeight = (value: number): string => Math.round(value || 0).toLocaleString("th-TH");

export default function SalesDispatchPage() {
  const [sellableBags, setSellableBags] = useState<SellableBag[]>([]);
  const [buyerPartners, setBuyerPartners] = useState<BuyerPartner[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [justAddedBagId, setJustAddedBagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (searchQuery.trim()) query.set("q", searchQuery.trim());
      query.set("take", "300");

      const [bagsResponse, buyersResponse] = await Promise.all([
        fetch(`/api/sales/sellable-bags?${query.toString()}`, { cache: "no-store" }),
        fetch("/api/partners?type=BUYER&active=true", { cache: "no-store" }),
      ]);

      if (!bagsResponse.ok || !buyersResponse.ok) {
        throw new Error("โหลดข้อมูลไม่สำเร็จ");
      }

      const [bagsPayload, buyersPayload] = await Promise.all([
        bagsResponse.json(),
        buyersResponse.json(),
      ]);

      setSellableBags(Array.isArray(bagsPayload) ? bagsPayload : []);
      const buyers = Array.isArray(buyersPayload) ? buyersPayload : [];
      setBuyerPartners(buyers);
      setSelectedBuyerId((prev) => {
        if (prev && buyers.some((buyer) => buyer.id === prev)) return prev;
        return "";
      });
    } catch (fetchError) {
      console.error("Error loading sales data:", fetchError);
      setError("ไม่สามารถโหลดข้อมูลการขายได้");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!justAddedBagId) return;
    const timeoutId = window.setTimeout(() => setJustAddedBagId(null), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [justAddedBagId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchDraft.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchDraft]);

  const cartBagIds = useMemo(() => new Set(cart.map((item) => item.bag_id)), [cart]);

  const addWholeBagToCart = (bag: SellableBag) => {
    setError("");
    setSuccess("");

    const wholeBagWeight = Math.max(0, Math.round(Number(bag.current_weight) || 0));
    if (wholeBagWeight <= 0) {
      setError(`เป้ ${bag.bag_code} ไม่มีน้ำหนักคงเหลือสำหรับขาย`);
      return;
    }

    if (cartBagIds.has(bag.id)) {
      setError(`เป้ ${bag.bag_code} อยู่ในตะกร้าแล้ว`);
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        bag_id: bag.id,
        bag_code: bag.bag_code,
        material: bag.material,
        quantity: wholeBagWeight,
      },
    ]);
    setJustAddedBagId(bag.id);
  };

  const removeCartItem = (bagId: string) => {
    setCart((prev) => prev.filter((item) => item.bag_id !== bagId));
  };

  const bagMap = useMemo(() => new Map(sellableBags.map((bag) => [bag.id, bag])), [sellableBags]);

  const cartTotalWeight = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cart]
  );

  const canDispatch = !submitting && !loading && cart.length > 0 && Boolean(selectedBuyerId);

  const dispatchStateText = !selectedBuyerId
    ? "กรุณาเลือกผู้รับซื้อ"
    : cart.length === 0
      ? "กรุณาเพิ่มรายการเป้"
      : "พร้อมยืนยันการส่งออก";

  const dispatchSale = async () => {
    const selectedBuyer = buyerPartners.find((partner) => partner.id === selectedBuyerId) ?? null;
    const customer = selectedBuyer?.factory_name?.trim() || selectedBuyer?.name?.trim() || "";

    if (!customer) {
      setError("กรุณาเลือกผู้รับซื้อ");
      return;
    }

    if (cart.length === 0) {
      setError("กรุณาเลือกเป้ใส่ตะกร้าก่อนส่งออก");
      return;
    }

    for (const item of cart) {
      const bag = bagMap.get(item.bag_id);
      if (!bag) {
        setError(`ไม่พบเป้ ${item.bag_code} ในรายการพร้อมขายล่าสุด`);
        return;
      }
      if ((Number(item.quantity) || 0) > (Number(bag.current_weight) || 0)) {
        setError(`ปริมาณขายของเป้ ${item.bag_code} เกินน้ำหนักคงเหลือ`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customer,
          note: orderNote.trim() || null,
          items: cart.map((item) => ({
            bag_id: item.bag_id,
            quantity: Math.max(0, Math.round(Number(item.quantity) || 0)),
            unit_price: 0,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "ส่งออกไม่สำเร็จ");
      }

      const payload = (await response.json()) as SaleOrderCreateResponse;
      setSuccess(`ส่งออกสำเร็จ เลขที่ใบขาย ${payload.sale_no}`);
      setCart([]);
      setOrderNote("");
      await loadData();
    } catch (dispatchError) {
      console.error("Error dispatching sale:", dispatchError);
      setError(dispatchError instanceof Error ? dispatchError.message : "ไม่สามารถส่งออกขายได้");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ส่งออกขาย</h1>
        <p className="text-sm text-muted-foreground">จัดการเป้พร้อมขายและยืนยันการส่งออก</p>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl">เป้พร้อมขาย</CardTitle>
              <Badge variant="outline">{sellableBags.length} เป้</Badge>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setSearchQuery(searchDraft.trim());
                  }
                }}
                className="h-11 !pl-10"
                placeholder="ค้นหา รหัสเป้ / ชนิดวัสดุ / หมายเหตุ"
              />
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[26%]">รหัสเป้</TableHead>
                    <TableHead className="w-[26%]">ชนิด</TableHead>
                    <TableHead className="w-[16%] text-right">คงเหลือ</TableHead>
                    <TableHead className="w-[22%] text-center">ตำแหน่ง</TableHead>
                    <TableHead className="w-[10%] text-center">เพิ่ม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellableBags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        ยังไม่มีเป้ที่พร้อมขาย
                      </TableCell>
                    </TableRow>
                  ) : (
                    sellableBags.map((bag) => {
                      const inCart = cartBagIds.has(bag.id);

                      return (
                        <TableRow key={bag.id} className={justAddedBagId === bag.id ? "bg-emerald-50/70" : ""}>
                          <TableCell className="py-2 font-semibold">{bag.bag_code}</TableCell>
                          <TableCell className="py-2">{bag.material || "-"}</TableCell>
                          <TableCell className="py-2 text-right tabular-nums">
                            {formatWeight(Number(bag.current_weight) || 0)}
                          </TableCell>
                          <TableCell className="py-2 text-center text-muted-foreground">
                            {bag.storage_slot
                              ? `${bag.storage_slot.zone.zone_code}/${bag.storage_slot.slot_code}`
                              : "-"}
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            {!inCart && Number(bag.current_weight || 0) > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="h-8 w-8"
                                onClick={() => addWholeBagToCart(bag)}
                                disabled={loading || submitting}
                                aria-label={`เพิ่ม ${bag.bag_code}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2 xl:col-span-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl">ตะกร้าขาย</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">ผู้รับซื้อ</p>
                <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="เลือกผู้รับซื้อ" />
                  </SelectTrigger>
                  <SelectContent>
                    {buyerPartners.map((partner) => {
                      const displayName = partner.factory_name || partner.name;
                      const displayCode = partner.partner_code ? ` (${partner.partner_code})` : "";
                      return (
                        <SelectItem key={partner.id} value={partner.id}>
                          {displayName}
                          {displayCode}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {buyerPartners.length === 0 ? (
                  <p className="text-xs text-amber-600">ยังไม่มี Partner ผู้รับซื้อ กรุณาเพิ่มที่หน้า Partners</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">หมายเหตุ</p>
                <Textarea
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  className="min-h-[90px]"
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ไม่บังคับ)"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-2xl">รายการสินค้า</CardTitle>
                <Badge variant="outline">{cart.length} รายการ</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="flex min-h-[110px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center">
                  <ShoppingBasket className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">ยังไม่มีรายการ</p>
                </div>
              ) : (
                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสเป้</TableHead>
                        <TableHead>ชนิด</TableHead>
                        <TableHead className="text-right">น้ำหนัก</TableHead>
                        <TableHead className="w-10 text-center">ลบ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.bag_id}>
                          <TableCell className="py-2 font-semibold">{item.bag_code}</TableCell>
                          <TableCell className="py-2 text-muted-foreground">{item.material || "-"}</TableCell>
                          <TableCell className="py-2 text-right tabular-nums">{formatWeight(item.quantity)}</TableCell>
                          <TableCell className="py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => removeCartItem(item.bag_id)}
                              disabled={submitting}
                              aria-label={`ลบ ${item.bag_code}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
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
              <CardTitle className="text-2xl">สรุปการส่งออก</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-sm font-medium text-muted-foreground">น้ำหนักรวมสุทธิ</div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-bold leading-none tabular-nums">{formatWeight(cartTotalWeight)}</span>
                  <span className="pb-1 text-lg font-medium leading-none text-muted-foreground">กก.</span>
                </div>
              </div>

              <div
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  canDispatch
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }`}
              >
                {dispatchStateText}
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => void dispatchSale()}
                disabled={!canDispatch}
              >
                {submitting ? "กำลังยืนยันการส่งออก..." : "ยืนยันการส่งออก"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
