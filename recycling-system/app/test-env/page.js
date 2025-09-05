// app/test-env/page.js
"use client"  // เพิ่มบรรทัดนี้ที่บรรทัดแรก!

import { useEffect, useState } from 'react'
import { testConnection } from '../../lib/supabase'  // แก้ path ให้ถูกต้อง

export default function TestEnv() {
  const [connectionStatus, setConnectionStatus] = useState('testing...')

  useEffect(() => {
    const runTest = async () => {
      const isConnected = await testConnection()
      setConnectionStatus(isConnected ? 'Connected ✅' : 'Failed ❌')
    }
    runTest()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Environment Variables Test</h1>
      <div>
        <h3>Supabase URL:</h3>
        <p>{process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
      </div>
      <div>
        <h3>Supabase Anon Key:</h3>
        <p>{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      </div>
      <div>
        <h3>Connection Test:</h3>
        <p>{connectionStatus}</p>
      </div>
    </div>
  )
}