import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

// ---- Supabase Client ------------------------------------------------------

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

const CONTRACTS_BUCKET = Deno.env.get('CONTRACTS_BUCKET') ?? 'contracts'
const SUMMARY_FOLDER = Deno.env.get('SUMMARY_FOLDER') ?? 'summaries'

// ---- CORS ------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://contractflowai.us",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
}

// ---- Server ---------------------------------------------------------------

serve(async (req: Request) => {
  // Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders })
  }

  try {
    const { contractId, storagePath, userId } = await req.json()

    if (!contractId || !userId) {
      return new Response(JSON.stringify({ error: "contractId and userId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      })
    }

    // Fake AI summary (replace with actual AI call later)
    const aiSummary = `AI summary for ${contractId} stored at ${storagePath ?? "n/a"}`
    const summaryPayload = {
      summary: aiSummary,
      generated_at: new Date().toISOString()
    }

    // Path inside the storage bucket
    const summaryPath = `${SUMMARY_FOLDER}/${contractId}/summary.json`

    // ---- Upload summary file ----------------------------------------------

    const uploadRes = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(
        summaryPath,
        new Blob([JSON.stringify(summaryPayload)], { type: "application/json" }),
        { upsert: true, cacheControl: "3600" }
      )

    if (uploadRes.error) {
      throw uploadRes.error
    }

    // ---- Update DB --------------------------------------------------------

    const dbRes = await supabase
      .from("contracts")
      .update({
        ai_summary: aiSummary,
        summary_path: summaryPath,
        updated_at: new Date().toISOString()
      })
      .eq("id", contractId)
      .eq("user_id", userId)

    if (dbRes.error) {
      throw dbRes.error
    }

    return new Response(JSON.stringify({
      success: true,
      summary: aiSummary,
      summaryPath
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: `${err}` }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    })
  }
})
