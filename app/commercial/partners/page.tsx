"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

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

type PartnerType = "SUPPLIER" | "BUYER" | "BOTH";

type Partner = {
  id: string;
  partner_code: string | null;
  name: string;
  factory_name: string | null;
  partner_type: PartnerType;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PartnerForm = {
  name: string;
  partner_type: PartnerType;
  contact_name: string;
  phone: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: PartnerForm = {
  name: "",
  partner_type: "SUPPLIER",
  contact_name: "",
  phone: "",
  address: "",
  notes: "",
};

const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  SUPPLIER: "ขายให้เรา (ต้นทาง)",
  BUYER: "เราขายให้ (ปลายทาง)",
  BOTH: "ทั้งสองฝั่ง",
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/partners", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load partners");
      const data = (await response.json()) as Partner[];
      setPartners(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError("ไม่สามารถโหลดข้อมูลคู่ค้าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPartners();
  }, []);

  const summary = useMemo(() => {
    const supplier = partners.filter(
      (partner) => partner.partner_type === "SUPPLIER" || partner.partner_type === "BOTH"
    ).length;

    const buyer = partners.filter(
      (partner) => partner.partner_type === "BUYER" || partner.partner_type === "BOTH"
    ).length;

    return {
      supplier,
      buyer,
      total: partners.length,
    };
  }, [partners]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const onEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setForm({
      name: partner.factory_name || partner.name,
      partner_type: partner.partner_type,
      contact_name: partner.contact_name || "",
      phone: partner.phone || "",
      address: partner.address || "",
      notes: partner.notes || "",
    });
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError("กรุณาระบุชื่อลูกค้า/โรงงาน");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const target = editingId ? `/api/partners/${editingId}` : "/api/partners";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(target, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to save partner");
      }

      await loadPartners();
      resetForm();
    } catch (saveError) {
      console.error(saveError);
      setError("ไม่สามารถบันทึกข้อมูลคู่ค้าได้");
    } finally {
      setSaving(false);
    }
  };

  const removePartner = async (partnerId: string, partnerName: string) => {
    const confirmed = window.confirm(`ยืนยันลบคู่ค้า ${partnerName} ?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/partners/${partnerId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete partner");
      await loadPartners();
      if (editingId === partnerId) resetForm();
    } catch (deleteError) {
      console.error(deleteError);
      setError("ไม่สามารถลบคู่ค้าได้");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">จัดการคู่ค้า</h1>
          <p className="text-sm text-muted-foreground">ตั้งค่าคู่ค้าฝั่งซื้อ/ฝั่งขาย และข้อมูลติดต่อ</p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void loadPartners()} disabled={loading || saving}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">คู่ค้าทั้งหมด</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">คู่ค้าฝั่งขายให้เรา</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.supplier}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">คู่ค้าฝั่งที่เราขายให้</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.buyer}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl">{editingId ? "แก้ไขข้อมูลคู่ค้า" : "เพิ่มคู่ค้าใหม่"}</CardTitle>
            {editingId ? (
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                ยกเลิกการแก้ไข
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            รหัสลูกค้าจะถูกสร้างอัตโนมัติเป็นเลขสั้นไม่เกิน 4 หลัก
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5 xl:col-span-2">
              <label className="text-sm font-medium">ชื่อลูกค้า/โรงงาน</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="ชื่อบริษัทหรือชื่อโรงงาน"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ประเภทคู่ค้า</label>
              <Select
                value={form.partner_type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, partner_type: value as PartnerType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPLIER">ขายให้เรา (ต้นทาง)</SelectItem>
                  <SelectItem value="BUYER">เราขายให้ (ปลายทาง)</SelectItem>
                  <SelectItem value="BOTH">ทั้งสองฝั่ง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ผู้ติดต่อ</label>
              <Input
                value={form.contact_name}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
                placeholder="ชื่อผู้ติดต่อ"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">โทรศัพท์</label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="เบอร์โทร"
              />
            </div>

            <div className="space-y-1.5 xl:col-span-3">
              <label className="text-sm font-medium">ที่อยู่</label>
              <Input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="ที่อยู่"
              />
            </div>

            <div className="space-y-1.5 xl:col-span-3">
              <label className="text-sm font-medium">หมายเหตุ</label>
              <Input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="เงื่อนไขการซื้อขาย / เวลาเข้ารับสินค้า / ข้อควรระวัง"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void submit()} disabled={saving} className="gap-2">
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มคู่ค้า"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">รายการคู่ค้า</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          ) : (
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อลูกค้า/โรงงาน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>ผู้ติดต่อ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-semibold tabular-nums">{partner.partner_code || "-"}</TableCell>
                      <TableCell>{partner.factory_name || partner.name}</TableCell>
                      <TableCell>{PARTNER_TYPE_LABEL[partner.partner_type]}</TableCell>
                      <TableCell>
                        <div>{partner.contact_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{partner.phone || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon-sm" onClick={() => onEdit(partner)} title="แก้ไข">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => removePartner(partner.id, partner.factory_name || partner.name)}
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {partners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        ยังไม่มีข้อมูลคู่ค้า
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
