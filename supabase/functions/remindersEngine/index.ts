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
    const { userId, cadence = 'daily', contractId, message } = await req.json()
    if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 })

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()

    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, title, client_name, closing_date')
      .eq('user_id', userId)
      .order('closing_date', { ascending: true })

    const payload = {
      cadence,
      recipients: user ? [user.email] : [],
      contracts: contracts ?? [],
      contractId,
      message
    }

    await supabase
      .from('contracts')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .limit(1)

    return new Response(JSON.stringify({ success: true, payload }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
