import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

serve(async (req) => {
  try {
    const { userId } = await req.json()
    if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 })

    const nextRenewal = new Date()
    nextRenewal.setMonth(nextRenewal.getMonth() + 1)

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ renews_at: nextRenewal.toISOString(), status: 'active' })
      .eq('user_id', userId)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, renews_at: nextRenewal.toISOString() }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
