import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import OpenAI from "https://esm.sh/openai@4.42.0";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_KEY") ?? "",
});

const CONTRACTS_BUCKET = "contracts";
const SUMMARY_FOLDER = "summaries";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://contractflowai.us",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("📥 Incoming payload:", body);

    const { contractId, storagePath, userId } = body;

    if (!storagePath || !userId || !contractId) {
      return new Response(
        JSON.stringify({ error: "storagePath, contractId, and userId required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // -----------------------------------------------------------------------
    // 1. Download the PDF from Supabase Storage
    // -----------------------------------------------------------------------
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("❌ PDF download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("📄 PDF downloaded successfully.");

    // -----------------------------------------------------------------------
    // 2. Send PDF to OpenAI GPT-4.1 for parsing
    // -----------------------------------------------------------------------

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are an expert real estate contract analyzer. Extract all important deadlines, parties, clauses, risk factors, and generate a clean JSON timeline + executive summary.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze this real estate contract PDF and extract all key information.",
            },
            {
              type: "input_file",
              mime_type: "application/pdf",
              data: new Uint8Array(await fileData.arrayBuffer()),
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "contract_summary",
          schema: {
            type: "object",
            properties: {
              executive_summary: { type: "string" },
              parties: {
                type: "object",
                properties: {
                  buyer: { type: "string" },
                  seller: { type: "string" },
                  agents: { type: "string" },
                },
              },
              deadlines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    date: { type: "string" },
                  },
                },
              },
              risks: { type: "array", items: { type: "string" } },
            },
            required: ["executive_summary", "deadlines"],
          },
        },
      },
      max_tokens: 8000,
    });

    const summaryData = JSON.parse(openaiResponse.choices[0].message.content);
    console.log("🤖 Parsed contract summary:", summaryData);

    // -----------------------------------------------------------------------
    // 3. Save JSON summary to Supabase Storage
    // -----------------------------------------------------------------------
    const summaryPath = `${SUMMARY_FOLDER}/${contractId}/summary.json`;

    const { error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(
        summaryPath,
        new Blob([JSON.stringify(summaryData, null, 2)], {
          type: "application/json",
        }),
        { upsert: true }
      );

    if (uploadError) {
      console.error("❌ Summary upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to store summary" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // -----------------------------------------------------------------------
    // 4. Update DB
    // -----------------------------------------------------------------------
    const { error: dbError } = await supabase
      .from("contracts")
      .update({
        ai_summary: summaryData.executive_summary,
        summary_path: summaryPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .eq("user_id", userId);

    if (dbError) {
      console.error("❌ DB update error:", dbError);
    }

    // -----------------------------------------------------------------------
    // 5. Return results to frontend
    // -----------------------------------------------------------------------
    return new Response(JSON.stringify(summaryData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🔥 Function crashed:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
