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
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce' // Better for OAuth
  },
  global: {
    headers: {
      'X-Client-Info': 'contractflowai-web'
    }
  }
})

const originalInvoke = supabase.functions.invoke.bind(supabase.functions)

supabase.functions.invoke = async function (fn, options) {
  const session = await supabase.auth.getSession()
  console.log('🔵 FUNCTION INVOKE:', {
    fn,
    body: options?.body,
    headers: options?.headers,
    session: session.data.session ? { user: session.data.session.user.id } : null
  })

  const result = await originalInvoke(fn, options)

  console.log('🟢 FUNCTION RESPONSE:', result)

  return result
}

console.log('⚡ Supabase client initialized')
