// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ทดสอบการเชื่อมต่อ
export const testConnection = async () => {
  try {
    // ทดสอบด้วยการ query ข้อมูลจากตาราง users
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection error:', error.message)
      return false
    }
    
    console.log('Supabase connected successfully!')
    return true
  } catch (error) {
    console.error('Connection test failed:', error.message)
    return false
  }
}