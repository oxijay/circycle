import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Circycle Frontend V2</h1>
        <p className="text-sm text-muted-foreground">
          โปรเจค UI ใหม่ (shadcn baseline) ที่ต่อกับ API เดิมเพื่อรักษา flow เดิมของระบบ
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Locations (Tree)</CardTitle>
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>แยกเป็น 2 หน้าแล้ว: Locations (ดูสินค้า/ย้ายเป้) และ Location Settings (ตั้งค่าโซน/ช่อง)</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/inventory/locations"
                className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                เปิดหน้า Locations
              </Link>
              <Link
                href="/inventory/location-settings"
                className="inline-flex rounded-md border px-3 py-2 text-sm font-medium text-foreground"
              >
                เปิดหน้า Settings
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bag Inventory</CardTitle>
              <Badge variant="outline">Pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            จะย้ายเป็นลำดับถัดไปหลัง lock หน้า Locations
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sales Dispatch</CardTitle>
              <Badge variant="outline">Pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            จะย้ายต่อจาก Bag Inventory โดยคง API และ flow ตะกร้าขายเดิม
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
