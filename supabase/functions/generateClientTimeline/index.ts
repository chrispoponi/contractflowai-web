import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient<Database>(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

serve(async (req) => {
  try {
    const { contractId, userId } = await req.json()
    if (!contractId || !userId) {
      return new Response(JSON.stringify({ error: 'contractId and userId required' }), { status: 400 })
    }

    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('user_id', userId)
      .single()

    if (error || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404 })
    }

    const timeline = {
      inspection: Boolean(contract.inspection_date),
      appraisal: Boolean(contract.appraisal_date),
      loan: Boolean(contract.loan_contingency_date),
      finalWalkthrough: Boolean(contract.final_walkthrough_date),
      closing: Boolean(contract.closing_date)
    }

    await supabase
      .from('contracts')
      .update({ timeline, updated_at: new Date().toISOString() })
      .eq('id', contractId)

    return new Response(JSON.stringify({ success: true, timeline }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
