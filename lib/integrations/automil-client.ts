export type AutomilVehicle = {
  id: string
  plateNo: string
  driverName?: string
  status?: string
}

type AutomilVehiclesResult = {
  source: 'automil' | 'mock'
  baseUrl?: string
  vehicles: AutomilVehicle[]
  error?: string
}

function normalizeVehicles(payload: unknown): AutomilVehicle[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? ((payload as { data: unknown[] }).data)
      : []

  return rows.reduce<AutomilVehicle[]>((acc, row) => {
      const r = row as Record<string, unknown>
      const id = String(r.id ?? r.vehicle_id ?? r.code ?? '')
      const plateNo = String(r.plateNo ?? r.plate_no ?? r.license_plate ?? r.plate ?? '')
      const driverName = String(r.driverName ?? r.driver_name ?? r.driver ?? '')
      const status = String(r.status ?? r.vehicle_status ?? '')

      if (!id && !plateNo) return acc

      acc.push({
        id: id || plateNo,
        plateNo: plateNo || id,
        driverName: driverName || undefined,
        status: status || undefined,
      })

      return acc
    }, [])
}

export async function getAutomilVehicles(): Promise<AutomilVehiclesResult> {
  const baseUrl = process.env.AUTOMIL_API_BASE_URL
  const token = process.env.AUTOMIL_API_TOKEN

  if (!baseUrl) {
    return {
      source: 'mock',
      vehicles: [
        { id: 'M-001', plateNo: '81-9001', driverName: 'สมชาย', status: 'AVAILABLE' },
        { id: 'M-002', plateNo: '81-9002', driverName: 'วิทยา', status: 'ON_TRIP' },
        { id: 'M-003', plateNo: '81-9003', driverName: 'ชาติชาย', status: 'MAINTENANCE' },
      ],
      error: 'AUTOMIL_API_BASE_URL not configured, using mock vehicles',
    }
  }

  const endpoints = ['/api/vehicles', '/api/fleet/vehicles', '/api/v1/vehicles']

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) continue

      const payload = await response.json()
      const vehicles = normalizeVehicles(payload)

      if (vehicles.length > 0) {
        return {
          source: 'automil',
          baseUrl,
          vehicles,
        }
      }
    } catch {
      // try next endpoint
    }
  }

  return {
    source: 'mock',
    baseUrl,
    vehicles: [
      { id: 'M-001', plateNo: '81-9001', driverName: 'สมชาย', status: 'AVAILABLE' },
      { id: 'M-002', plateNo: '81-9002', driverName: 'วิทยา', status: 'ON_TRIP' },
    ],
    error: `Failed to fetch vehicles from Automil at ${baseUrl}`,
  }
}
