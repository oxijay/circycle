import { UserRole } from '@prisma/client'

export const PERMISSIONS = {
  BAGS_VIEW: 'bags.view',
  BAGS_UPDATE: 'bags.update',
  BAGS_SPLIT_MERGE: 'bags.split_merge',
  TRIPS_VIEW: 'trips.view',
  TRIPS_MANAGE: 'trips.manage',
  TRIP_PLANS_MANAGE: 'trip_plans.manage',
  TRIP_PLANS_OPEN: 'trip_plans.open',
  INVENTORY_LOCATIONS_MANAGE: 'inventory.locations.manage',
  PARTNERS_MANAGE: 'partners.manage',
  SALES_VIEW: 'sales.view',
  SALES_DISPATCH: 'sales.dispatch',
  AUDIT_VIEW: 'audit.view',
  USERS_MANAGE: 'users.manage',
  SYSTEM_SETTINGS_MANAGE: 'system.settings.manage',
  PRICING_VIEW: 'pricing.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const workerPermissions: Permission[] = [
  PERMISSIONS.BAGS_VIEW,
  PERMISSIONS.BAGS_UPDATE,
  PERMISSIONS.BAGS_SPLIT_MERGE,
  PERMISSIONS.TRIPS_VIEW,
  PERMISSIONS.TRIP_PLANS_OPEN,
]

const officePermissions: Permission[] = [
  ...workerPermissions,
  PERMISSIONS.TRIPS_MANAGE,
  PERMISSIONS.TRIP_PLANS_MANAGE,
  PERMISSIONS.INVENTORY_LOCATIONS_MANAGE,
  PERMISSIONS.PARTNERS_MANAGE,
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_DISPATCH,
]

const executivePermissions: Permission[] = [
  ...officePermissions,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.PRICING_VIEW,
]

const adminPermissions: Permission[] = [
  ...officePermissions,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
]

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  WORKER: new Set(workerPermissions),
  OFFICE: new Set(officePermissions),
  EXECUTIVE: new Set(executivePermissions),
  ADMIN: new Set(adminPermissions),
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission)
}
