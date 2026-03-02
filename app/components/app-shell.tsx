'use client'

import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  Factory,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  PlusCircle,
  RefreshCw,
  Settings,
  ShoppingCart,
  Split,
  Truck,
  Users,
  X,
} from 'lucide-react'
import styles from './app-shell.module.css'

type NavItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

type NavGroup = {
  title: string
  items: NavItem[]
}

type AuthUser = {
  id: string
  employee_code: string
  display_name: string
  role: 'WORKER' | 'OFFICE' | 'EXECUTIVE' | 'ADMIN'
}

type AuthContextPayload = {
  current_user: AuthUser | null
  users: AuthUser[]
}

const groups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Operations',
    items: [
      { label: 'New Trip', href: '/operations/new-trip', icon: PlusCircle },
      { label: 'Trips', href: '/operations/trips', icon: Truck },
      { label: 'Inbound Materials', href: '/operations/inbound', icon: Factory },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Locations', href: '/inventory/locations', icon: MapPin },
      { label: 'Bag Inventory', href: '/inventory/bags', icon: Package },
      { label: 'Bag Movements', href: '/inventory/movements', icon: Split },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { label: 'Sales Dispatch', href: '/commercial/sales', icon: ShoppingCart },
      { label: 'Sales Summary', href: '/commercial/sales-summary', icon: BarChart3 },
      { label: 'Partners', href: '/commercial/partners', icon: Users },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', href: '/insights/reports', icon: BarChart3 },
      { label: 'Alerts', href: '/insights/alerts', icon: AlertTriangle },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Fleet Sync', href: '/system/fleet-sync', icon: RefreshCw },
      { label: 'Settings', href: '/system/settings', icon: Settings },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isNewTripFlow = pathname === '/operations/trips' && searchParams.get('new') === '1'
  const isStandaloneRoute =
    pathname.startsWith('/m/') || /^\/inventory\/bags\/[^/]+\/qr$/.test(pathname)
  const [authContext, setAuthContext] = useState<AuthContextPayload | null>(null)
  const [switchingUser, setSwitchingUser] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    let mounted = true
    const loadAuthContext = async () => {
      try {
        const response = await fetch('/api/auth/context', { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as AuthContextPayload
        if (!mounted) return
        setAuthContext(payload)
      } catch (error) {
        console.error('Failed to load auth context:', error)
      }
    }
    void loadAuthContext()
    return () => {
      mounted = false
    }
  }, [pathname])

  const currentTitle = useMemo(() => {
    for (const group of groups) {
      for (const item of group.items) {
        if (isActive(pathname, item.href)) return item.label
      }
    }
    return 'Dashboard'
  }, [pathname])

  if (isStandaloneRoute) {
    return <>{children}</>
  }

  const currentUser = authContext?.current_user ?? null
  const users = authContext?.users ?? []

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>Circycle Ops</div>

        <nav className={styles.nav}>
          {groups.map((group) => (
            <div key={group.title} className={styles.navGroup}>
              <p className={styles.groupTitle}>{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                const active =
                  item.href === '/operations/new-trip'
                    ? isActive(pathname, item.href) || isNewTripFlow
                    : item.href === '/operations/trips'
                      ? isActive(pathname, item.href) && !isNewTripFlow
                      : isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.active : ''}`}
                  >
                    <Icon className={styles.icon} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileToggle}
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className={styles.icon} /> : <Menu className={styles.icon} />}
          </button>
          <h1 className={styles.topbarTitle}>{currentTitle}</h1>
          <div className={styles.topbarHint}>Factory Scrap Management</div>
          <div className={styles.userArea}>
            <div className={styles.userRole}>{currentUser?.role ?? '-'}</div>
            <select
              className={styles.userSelect}
              value={currentUser?.id ?? ''}
              onChange={async (event) => {
                const nextUserId = event.target.value
                if (!nextUserId) return
                try {
                  setSwitchingUser(true)
                  const response = await fetch('/api/auth/context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: nextUserId }),
                  })
                  if (!response.ok) return
                  const payload = (await response.json()) as AuthContextPayload
                  setAuthContext(payload)
                } catch (error) {
                  console.error('Failed to switch user:', error)
                } finally {
                  setSwitchingUser(false)
                }
              }}
              disabled={users.length === 0 || switchingUser}
              aria-label="สลับผู้ใช้งาน"
            >
              {users.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.display_name} ({row.employee_code})
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
