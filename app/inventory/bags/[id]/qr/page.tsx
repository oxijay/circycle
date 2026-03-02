"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BagDetail = {
  id: string;
  bag_code: string;
  material: string | null;
  current_weight: number;
  filled_at: string | null;
  created_at: string;
  trip: {
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
};

const formatWeight = (value: number): string => Math.round(Number(value) || 0).toLocaleString("th-TH");

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH");
};

export default function BagQrPage() {
  const params = useParams<{ id: string }>();
  const bagId = String(params?.id ?? "");

  const [bag, setBag] = useState<BagDetail | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mobileUrl = useMemo(() => {
    if (typeof window === "undefined" || !bag?.id) return "";
    return `${window.location.origin}/m/bags/${bag.id}`;
  }, [bag?.id]);

  const loadBag = useCallback(async () => {
    if (!bagId) return;

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/bags/${bagId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as BagDetail & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "ไม่สามารถโหลดข้อมูลเป้ได้");
      }
      setBag(payload);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดข้อมูลเป้ได้");
      setBag(null);
    } finally {
      setLoading(false);
    }
  }, [bagId]);

  useEffect(() => {
    void loadBag();
  }, [loadBag]);

  useEffect(() => {
    const generate = async () => {
      if (!mobileUrl) {
        setQrImage("");
        return;
      }

      try {
        const QRCode = (await import("qrcode")).default;
        const value = await QRCode.toDataURL(mobileUrl, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M",
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        setQrImage(value);
      } catch (qrError) {
        console.error("Failed to generate QR image:", qrError);
      }
    };

    void generate();
  }, [mobileUrl]);

  const partnerName =
    bag?.trip.partner?.factory_name?.trim() ||
    bag?.trip.partner?.name?.trim() ||
    bag?.trip.customer_factory ||
    "-";

  const slotLabel = bag?.storage_slot
    ? `${bag.storage_slot.zone.zone_code}/${bag.storage_slot.slot_code}`
    : "-";

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 p-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">QR เป้ {bag?.bag_code || "-"}</CardTitle>
          <p className="text-sm text-muted-foreground">สแกนด้วยมือถือเพื่อดูรายละเอียดเป้ล่าสุด</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? <div className="error-message">{error}</div> : null}

          <div className="rounded-xl border bg-muted/20 p-4">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
            ) : qrImage ? (
              <Image
                src={qrImage}
                alt={`QR ของเป้ ${bag?.bag_code || "-"}`}
                width={256}
                height={256}
                unoptimized
                className="mx-auto h-64 w-64 rounded-lg border bg-white p-2"
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">ไม่สามารถสร้าง QR ได้</p>
            )}
          </div>

          {bag ? (
            <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm">
              <div>
                <span className="font-semibold text-muted-foreground">รหัสเป้:</span> <span className="font-semibold">{bag.bag_code}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">ชนิด:</span> {bag.material || "-"}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">น้ำหนักคงเหลือ:</span> {formatWeight(bag.current_weight)} กก.
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">ตำแหน่ง:</span> {slotLabel}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">ที่มา:</span> {partnerName}
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">วันที่บรรจุ:</span> {formatDateTime(bag.filled_at || bag.created_at)}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {mobileUrl ? (
              <Button asChild variant="outline">
                <Link href={mobileUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  เปิดลิงก์มือถือ
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled className="gap-2">
                <ExternalLink className="h-4 w-4" />
                เปิดลิงก์มือถือ
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/inventory/bags">กลับหน้า Bag Inventory</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
