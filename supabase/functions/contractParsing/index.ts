import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

const CONTRACTS_BUCKET = Deno.env.get('CONTRACTS_BUCKET') ?? 'contracts'
const SUMMARY_FOLDER = 'summaries' // stored inside the same bucket

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contractflowai.us',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { contractId, storagePath, userId } = body

    if (!contractId || !userId) {
      return new Response(
        JSON.stringify({ error: 'contractId and userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -----------------------------------------------------------------------
    // FAKE AI SUMMARY FOR NOW (replace with your AI service later)
    // -----------------------------------------------------------------------
    const aiSummary = `AI summary for contract ${contractId}`

    const summaryPayload = {
      summary: aiSummary,
      generated_at: new Date().toISOString(),
      original_file: storagePath ?? null
    }

const summaryPath = `${SUMMARY_FOLDER}/${contractId}/summary.json`

    // Upload summary file
    const { error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(
        summaryPath,
        new Blob([JSON.stringify(summaryPayload)], { type: 'application/json' }),
        {
          upsert: true,
          cacheControl: '3600'
        }
      )

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Save summary info to DB
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        ai_summary: aiSummary,
        summary_path: summaryPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('DB update error:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: aiSummary,
        summaryPath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
