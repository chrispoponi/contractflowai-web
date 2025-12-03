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
    const { contractId, storagePath, ownerId } = await req.json()
    if (!contractId) return new Response(JSON.stringify({ error: 'contractId required' }), { status: 400 })

    const aiSummary = `AI summary for ${contractId} stored at ${storagePath ?? 'n/a'}`
    const summaryPayload = {
      summary: aiSummary,
      generated_at: new Date().toISOString()
    }
    const summaryPath = `${contractId}/summary.json`
    await supabase.storage.from('summaries').upload(summaryPath, new Blob([JSON.stringify(summaryPayload)], { type: 'application/json' }), {
      upsert: true
    })

    const { error } = await supabase
      .from('contracts')
      .update({ ai_summary: aiSummary, summary_path: summaryPath, updated_at: new Date().toISOString() })
      .eq('id', contractId)
      .eq('owner_id', ownerId ?? '')

    if (error) throw error

    return new Response(JSON.stringify({ success: true, summary: aiSummary }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
