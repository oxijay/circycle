"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VehiclePayload = {
  vehicles?: Array<{
    id?: string;
    plateNo?: string;
    driverName?: string;
    status?: string;
  }>;
  source?: string;
  error?: string;
};

export default function FleetSyncPage() {
  const [payload, setPayload] = useState<VehiclePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/integrations/automil/vehicles", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as VehiclePayload;
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถโหลดข้อมูลเชื่อมต่อ Fleet ได้");
      }
      setPayload(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "ไม่สามารถโหลดข้อมูลเชื่อมต่อ Fleet ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const vehicles = payload?.vehicles ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fleet Sync</h1>
          <p className="text-sm text-muted-foreground">ตรวจสถานะการเชื่อมต่อข้อมูลรถและคนขับจาก Automil</p>
        </div>
        <Button variant="outline" onClick={() => void loadVehicles()} disabled={loading}>
          {loading ? "กำลังโหลด..." : "รีเฟรช"}
        </Button>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">ผลการเชื่อมต่อ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            แหล่งข้อมูลล่าสุด: <span className="font-medium">{payload?.source || "-"}</span>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="h-10 px-3 text-left font-medium">ทะเบียนรถ</th>
                  <th className="h-10 px-3 text-left font-medium">คนขับ</th>
                  <th className="h-10 px-3 text-left font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle, index) => (
                  <tr key={`${vehicle.id ?? "vehicle"}-${index}`} className="border-t">
                    <td className="px-3 py-2">{vehicle.plateNo || "-"}</td>
                    <td className="px-3 py-2">{vehicle.driverName || "-"}</td>
                    <td className="px-3 py-2">{vehicle.status || "-"}</td>
                  </tr>
                ))}
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                      {loading ? "กำลังโหลด..." : "ยังไม่มีข้อมูลยานพาหนะ"}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
