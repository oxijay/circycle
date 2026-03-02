"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BagMovementRow = {
  id: string;
  movement_type: string;
  quantity: number;
  occurred_at: string;
  sale_reference: string | null;
  note: string | null;
  referenceBag?: {
    bag_code: string;
  } | null;
};

type BagDetail = {
  id: string;
  bag_code: string;
  material: string | null;
  current_weight: number;
  status: string;
  ready_for_sale: boolean;
  filled_at: string | null;
  created_at: string;
  trip: {
    vehicle_id: string | null;
    customer_factory: string;
    partner?: {
      name: string;
      factory_name: string | null;
    } | null;
  };
  storage_slot?: {
    slot_code: string;
    zone: {
      zone_code: string;
      zone_name: string;
    };
  } | null;
  movements: BagMovementRow[];
};

const BAG_STATUS_LABELS: Record<string, string> = {
  OPEN: "พร้อมใช้งาน",
  PARTIAL: "ขายบางส่วน",
  SOLD: "ขายหมดแล้ว",
  SPLIT: "ถูกแยก/รวมแล้ว",
  CLOSED: "ปิดรายการ",
};

const MOVEMENT_LABELS: Record<string, string> = {
  PACK_IN: "บรรจุเข้าเป้",
  SPLIT_OUT: "ตัดออกเพื่อแยก/รวม",
  SPLIT_IN: "รับเข้าเป้จากแยก/รวม",
  SALE_OUT: "ตัดขาย",
  ADJUST_IN: "ปรับเพิ่ม",
  ADJUST_OUT: "ปรับลด",
};

const formatWeight = (value: number): string => Math.round(Number(value) || 0).toLocaleString("th-TH");

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
};

export default function MobileBagDetailPage() {
  const params = useParams<{ id: string }>();
  const bagId = String(params?.id ?? "");

  const [bag, setBag] = useState<BagDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBag = useCallback(async () => {
    if (!bagId) return;

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/bags/${bagId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as BagDetail & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถโหลดรายละเอียดเป้ได้");
      }
      setBag(payload);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดรายละเอียดเป้ได้");
      setBag(null);
    } finally {
      setLoading(false);
    }
  }, [bagId]);

  useEffect(() => {
    void loadBag();
  }, [loadBag]);

  const partnerName =
    bag?.trip.partner?.factory_name?.trim() ||
    bag?.trip.partner?.name?.trim() ||
    bag?.trip.customer_factory ||
    "-";

  const slotLabel = bag?.storage_slot
    ? `${bag.storage_slot.zone.zone_code}/${bag.storage_slot.slot_code}`
    : "-";

  return (
    <div className="mx-auto w-full max-w-md space-y-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{bag?.bag_code || "รายละเอียดเป้"}</CardTitle>
          <p className="text-sm text-muted-foreground">รายละเอียดเป้จากการสแกน QR</p>
        </CardHeader>
        <CardContent>
          {error ? <div className="error-message">{error}</div> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
          ) : bag ? (
            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-semibold text-muted-foreground">ชนิด:</span> {bag.material || "-"}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">น้ำหนักคงเหลือ:</span> {formatWeight(bag.current_weight)} กก.
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">สถานะเป้:</span> {BAG_STATUS_LABELS[bag.status] || bag.status}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">สถานะขาย:</span> {bag.ready_for_sale ? "พร้อมขาย" : "รอคัดแยก"}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">ตำแหน่งเก็บ:</span> {slotLabel}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">ที่มา:</span> {partnerName}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">ทะเบียนรถ:</span> {bag.trip.vehicle_id || "-"}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">วันที่บรรจุ:</span> {formatDateTime(bag.filled_at || bag.created_at)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ไม่พบข้อมูลเป้</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ประวัติล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลดประวัติ...</p>
          ) : !bag || bag.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการเคลื่อนไหว</p>
          ) : (
            <div className="space-y-2">
              {bag.movements.map((row) => (
                <div key={row.id} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div className="font-medium">{MOVEMENT_LABELS[row.movement_type] || row.movement_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(row.occurred_at)} | {formatWeight(row.quantity)} กก.
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    อ้างอิง: {row.referenceBag?.bag_code || row.sale_reference || "-"}
                  </div>
                  {row.note ? <div className="mt-1 text-xs text-muted-foreground">หมายเหตุ: {row.note}</div> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
