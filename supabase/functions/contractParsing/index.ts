import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

const CONTRACTS_BUCKET = Deno.env.get('CONTRACTS_BUCKET') ?? 'contracts'
const SUMMARY_FOLDER = Deno.env.get('SUMMARY_FOLDER') ?? 'summaries'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contractflowai.us',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
} as const

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { contractId, storagePath, userId } = await req.json()
    if (!contractId || !userId) {
      return new Response(JSON.stringify({ error: 'contractId and userId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const aiSummary = `AI summary for ${contractId} stored at ${storagePath ?? 'n/a'}`
    const summaryPayload = {
      summary: aiSummary,
      generated_at: new Date().toISOString()
    }

    const summaryPath = `${SUMMARY_FOLDER}/${contractId}/summary.json`

    const { error: summaryUploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(summaryPath, new Blob([JSON.stringify(summaryPayload)], { type: 'application/json' }), {
        upsert: true,
        cacheControl: '3600'
      })

    if (summaryUploadError) {
      throw summaryUploadError
    }

    const { error } = await supabase
      .from('contracts')
      .update({
        ai_summary: aiSummary,
        summary_path: summaryPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .eq('user_id', userId)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, summary: aiSummary, summaryPath }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})