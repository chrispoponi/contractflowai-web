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

    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, referral_source')
      .eq('user_id', userId)

    const enriched = (contracts ?? []).map((contract) => ({
      id: contract.id,
      referral_source: contract.referral_source ?? 'Unknown referral'
    }))

    return new Response(JSON.stringify({ success: true, referrals: enriched }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
