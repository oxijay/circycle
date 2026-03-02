import { NextResponse } from 'next/server'
import { getAutomilVehicles } from '@/lib/integrations/automil-client'

export async function GET() {
  try {
    const payload = await getAutomilVehicles()
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to fetch Automil vehicles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Automil vehicles', vehicles: [], source: 'mock' },
      { status: 500 }
    )
  }
}
