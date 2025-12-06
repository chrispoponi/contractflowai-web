import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  throw new Error('⛔ Supabase environment variables missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON KEY.')
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true
  }
})
