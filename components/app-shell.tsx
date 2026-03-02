"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarClock,
  Factory,
  Handshake,
  LayoutDashboard,
  Link2,
  MapPin,
  MapPinned,
  Package,
  ReceiptText,
  Scale,
  Settings,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Operations",
    items: [
      { label: "Trip Plans", href: "/operations/trip-plans", icon: CalendarClock },
      { label: "Trips", href: "/operations/trips", icon: Truck },
      { label: "Inbound", href: "/operations/inbound", icon: Warehouse },
      { label: "Weighbridge", href: "/operations/weighbridge", icon: Scale },
      { label: "Reconciliation", href: "/operations/reconciliation", icon: AlertTriangle },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Locations", href: "/inventory/locations", icon: MapPin },
      { label: "Location Settings", href: "/inventory/location-settings", icon: MapPinned },
      { label: "Bag Inventory", href: "/inventory/bags", icon: Package },
    ],
  },
  {
    title: "Commercial",
    items: [
      { label: "Sales Dispatch", href: "/commercial/sales", icon: ShoppingCart },
      { label: "Sales History", href: "/commercial/sales-history", icon: ReceiptText },
      { label: "Partners", href: "/commercial/partners", icon: Handshake },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Alerts", href: "/insights/alerts", icon: Bell },
      { label: "Reports", href: "/insights/reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Fleet Sync", href: "/system/fleet-sync", icon: Link2 },
      { label: "Settings", href: "/system/settings", icon: Settings },
    ],
  },
];

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobileScanRoute = pathname.startsWith("/m/");
  const locationsHeader =
    pathname === "/inventory/locations"
      ? {
          title: "Storage Locations",
          subtitle: "ดูตำแหน่งสินค้าในโซน/ช่องและย้ายเป้ระหว่างช่อง",
          section: "โครงสร้างตำแหน่ง (View)",
        }
      : null;
  const [authContext, setAuthContext] = useState<AuthContextPayload | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (isMobileScanRoute) return;

    let mounted = true;

    const loadContext = async () => {
      try {
        const response = await fetch("/api/auth/context", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as AuthContextPayload;
        if (mounted) setAuthContext(payload);
      } catch (error) {
        console.error("Failed to load auth context:", error);
      }
    };

    void loadContext();
    return () => {
      mounted = false;
    };
  }, [isMobileScanRoute]);

  if (isMobileScanRoute) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-white p-4 md:p-5">
          <div className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Factory className="h-5 w-5 text-blue-600" />
            Circycle V2
          </div>
          <nav className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.title}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isTripsRoot = item.href === "/operations/trips";
                  const hasTripQuery = Boolean(searchParams.get("trip"));
                  const hasNewQuery = searchParams.get("new") === "1";
                  const active =
                    item.href === "/"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(event) => {
                        if (
                          isTripsRoot &&
                          pathname === "/operations/trips" &&
                          (hasTripQuery || hasNewQuery)
                        ) {
                          event.preventDefault();
                          router.replace("/operations/trips");
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="p-4 md:p-6">
          <div
            className={cn(
              "mb-4 flex flex-wrap gap-2 text-sm",
              locationsHeader ? "items-start justify-between" : "items-center justify-end"
            )}
          >
            {locationsHeader ? (
              <div className="space-y-0.5">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">{locationsHeader.title}</h1>
                <p className="text-sm text-muted-foreground">{locationsHeader.subtitle}</p>
                <p className="text-sm font-medium text-muted-foreground">{locationsHeader.section}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="text-muted-foreground">
                {authContext?.current_user
                  ? `${authContext.current_user.display_name} (${authContext.current_user.role})`
                  : "กำลังโหลดผู้ใช้งาน..."}
              </div>
              <select
                className="h-9 min-w-[220px] rounded-md border bg-white px-3 text-sm"
                value={authContext?.current_user?.id ?? ""}
                disabled={switching || !authContext}
                onChange={async (event) => {
                  const userId = event.target.value;
                  if (!userId) return;
                  try {
                    setSwitching(true);
                    const response = await fetch("/api/auth/context", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ user_id: userId }),
                    });
                    if (!response.ok) return;
                    const payload = (await response.json()) as AuthContextPayload;
                    setAuthContext(payload);
                  } catch (error) {
                    console.error("Failed to switch user:", error);
                  } finally {
                    setSwitching(false);
                  }
                }}
              >
                {(authContext?.users ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name} ({user.employee_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
