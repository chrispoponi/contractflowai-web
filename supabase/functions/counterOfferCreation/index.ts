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
    const { contractId, storagePath, fileName, userId } = await req.json()
    if (!contractId || !storagePath || !userId) {
      return new Response(JSON.stringify({ error: 'contractId, storagePath, and userId required' }), { status: 400 })
    }

    const { data: parent, error: parentError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('user_id', userId)
      .single()

    if (parentError || !parent) {
      return new Response(JSON.stringify({ error: 'Parent contract not found' }), { status: 404 })
    }

    const insertPayload = {
      user_id: parent.user_id,
      title: `${parent.title} – Counter Offer`,
      status: 'pending' as const,
      counter_offer_path: storagePath,
      is_counter_offer: true,
      parent_contract_id: parent.id
    }

    const { data, error } = await supabase.from('contracts').insert(insertPayload).select().single()
    if (error) throw error

    return new Response(JSON.stringify({ success: true, counterOffer: data, fileName }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
