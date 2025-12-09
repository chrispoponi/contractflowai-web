// ============================================================================
// ContractFlowAI — Edge Function: contractParsing
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import OpenAI from "https://esm.sh/openai@4.42.0";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_KEY")!,
});

const CONTRACTS_BUCKET = "contracts";
const SUMMARY_FOLDER = "summaries";
const RAW_FOLDER = "raw";

const MODEL_NAME = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1";
const FALLBACK_MODEL = Deno.env.get("OPENAI_FALLBACK_MODEL") ?? "gpt-4o-mini";
const MAX_TEXT_SNAPSHOT = 120_000;

// JSON schema for the LLM output
const SUMMARY_SCHEMA = {
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
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
  required: ["executive_summary", "deadlines"],
};

// Prompts
const PRIMARY_PROMPT =
  "You are an expert real estate contract analyzer. Return ONLY valid JSON (no prose). Extract deadlines, parties, clauses, and risk factors. Use null when unsure.";

const FALLBACK_PROMPT =
  "You are a conservative real estate contract analyst. Extract only fields explicitly found in the document. Use null when unsure. Return ONLY valid JSON.";

// ---------------------------------------------------------------------------
// CORS + HEADERS
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://contractflowai.us",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// MAIN EDGE FUNCTION SERVER
// ---------------------------------------------------------------------------

serve(async (req) => {
  let requestUserId: string | null = null;
  let requestContractId: string | null = null;
  let requestStoragePath: string | null = null;

  // OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // -----------------------------------------------------------------------
    // SAFE BODY PARSING
    // -----------------------------------------------------------------------
    let bodyText = "";
    let body: any = null;

    try {
      bodyText = await req.text();
      console.log("📥 Raw body:", bodyText);
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch (err) {
      console.error("❌ JSON parse failed:", err);

      return new Response(
        JSON.stringify({
          error: "Invalid JSON sent to contractParsing",
          raw: bodyText,
          detail: String(err),
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { contractId, storagePath, userId } = body ?? {};

    console.log("🧪 VALIDATING PAYLOAD:", {
      contractId, storagePath, userId,
      types: {
        contractId: typeof contractId,
        storagePath: typeof storagePath,
        userId: typeof userId
      }
    });

    // Validate required fields
    if (
      !contractId || typeof contractId !== "string" || !contractId.trim() ||
      !storagePath || typeof storagePath !== "string" || !storagePath.trim() ||
      !userId || typeof userId !== "string" || !userId.trim()
    ) {
      console.error("❌ BAD PAYLOAD:", body);

      return new Response(
        JSON.stringify({
          error: "Missing or invalid fields: contractId, storagePath, userId",
          received: body
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Assign for crash logs
    requestContractId = contractId;
    requestStoragePath = storagePath;
    requestUserId = userId;

    // Mark status
    await updateContractStatus(contractId, "uploaded");

    // -----------------------------------------------------------------------
    // DOWNLOAD PDF
    // -----------------------------------------------------------------------

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("❌ Failed downloading PDF:", downloadError);

      await updateContractStatus(contractId, "error");
      return new Response(
        JSON.stringify({ error: "Could not download PDF" }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("📄 PDF downloaded.");
    const fileBytes = new Uint8Array(await fileData.arrayBuffer());

    await persistRaw(contractId, fileBytes);

    // -----------------------------------------------------------------------
    // PARSING PIPELINE
    // -----------------------------------------------------------------------

    const attempts: any[] = [];
    let finalSummary: NormalizedSummary | null = null;

    // PRIMARY ATTEMPT
    const primary = await attemptParse("primary", MODEL_NAME, () =>
      parseWithModel(MODEL_NAME, fileBytes, PRIMARY_PROMPT)
    );
    attempts.push(primary.log);

    if (primary.summary) finalSummary = primary.summary;

    // FALLBACK
    if (!finalSummary) {
      const fallback = await attemptParse("fallback", FALLBACK_MODEL, () =>
        parseWithModel(FALLBACK_MODEL, fileBytes, FALLBACK_PROMPT)
      );
      attempts.push(fallback.log);

      if (fallback.summary) finalSummary = fallback.summary;
    }

    // MICRO PARSER
    if (!finalSummary) {
      const micro = await attemptParse("micro", "regex", () =>
        runMicroExtractor(fileBytes)
      );
      attempts.push(micro.log);

      if (micro.summary) finalSummary = micro.summary;
    }

    if (!finalSummary) {
      console.error("❌ All parsing attempts failed.");
      await updateContractStatus(contractId, "error");

      return new Response(
        JSON.stringify({
          error: "Unable to parse contract",
          attempts
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("🤖 FINAL SUMMARY:", finalSummary);

    // -----------------------------------------------------------------------
    // STORE SUMMARY + METADATA
    // -----------------------------------------------------------------------

    const summaryPath = await storeSummary(contractId, finalSummary);

    await updateContractRecord(contractId, userId, finalSummary, summaryPath);

    await updateContractStatus(contractId, "completed");

    const deadlineMap = mapDeadlines(finalSummary.deadlines);

    return new Response(
      JSON.stringify({
        summary: finalSummary.executive_summary,
        deadlines: deadlineMap,
        contractId,
        attempts
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("🔥 EDGE FUNCTION CRASH:", err);

    if (requestContractId) {
      await updateContractStatus(requestContractId, "error");
    }

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// ---------------------------------------------------------------------------
// Helper Functions (same as before, cleaned + stable)
// ---------------------------------------------------------------------------

async function updateContractStatus(id: string, status: string) {
  await supabase
    .from("contracts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
}

async function persistRaw(contractId: string, bytes: Uint8Array) {
  const path = `${SUMMARY_FOLDER}/${contractId}/${RAW_FOLDER}.txt`;
  const base64 = btoa(String.fromCharCode(...bytes));

  await supabase.storage.from(CONTRACTS_BUCKET).upload(
    path,
    new Blob(
      [JSON.stringify({ encoding: "base64", data: base64 }, null, 2)],
      { type: "application/json" }
    ),
    { upsert: true }
  );
}

async function storeSummary(contractId: string, summary: any) {
  const path = `${SUMMARY_FOLDER}/${contractId}/summary.json`;

  await supabase.storage.from(CONTRACTS_BUCKET).upload(
    path,
    new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" }),
    { upsert: true }
  );

  return path;
}

type ParseLog = { stage: string; model: string; success: boolean; error?: string };

async function attemptParse(stage: string, model: string, fn: () => Promise<any>) {
  const log: ParseLog = { stage, model, success: false };

  try {
    const summary = await fn();
    log.success = true;
    return { summary, log };
  } catch (err) {
    log.error = String(err);
    return { summary: null, log };
  }
}

async function parseWithModel(model: string, bytes: Uint8Array, prompt: string) {
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 8000,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Extract all key contract information." },
          { type: "input_file", mime_type: "application/pdf", data: bytes }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contract_summary",
        schema: SUMMARY_SCHEMA,
        strict: true
      }
    }
  });

  const content = res.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON returned by model");
  }

  const validated = normalizeAndValidate(parsed);

  if (!validated.valid || !validated.summary) {
    throw new Error(`Validation failed: ${validated.errors?.join(", ")}`);
  }

  return validated.summary;
}

// MICRO EXTRACTOR (unchanged, cleaned)
async function runMicroExtractor(bytes: Uint8Array): Promise<NormalizedSummary> {
  const text = new TextDecoder().decode(bytes).slice(0, MAX_TEXT_SNAPSHOT);

  if (!text || text.replace(/\s+/g, "").length < 30) {
    throw new Error("Too little text for micro parser");
  }

  const deadlines = [];
  const summary = text.split(/\n+/).slice(0, 6).join(" ");

  return {
    executive_summary: summary || "Summary unavailable.",
    parties: { buyer: null, seller: null, agents: null },
    deadlines,
    risks: []
  };
}

function normalizeAndValidate(payload: any) {
  const errors: string[] = [];

  const executive_summary =
    typeof payload.executive_summary === "string"
      ? payload.executive_summary.trim()
      : null;

  if (!executive_summary) errors.push("Missing executive_summary");

  const deadlines =
    Array.isArray(payload.deadlines) ? payload.deadlines : [];
  if (deadlines.length === 0) errors.push("No deadlines found");

  return {
    valid: errors.length === 0,
    errors,
    summary: errors.length === 0 ? payload : null
  };
}

// Normalizes deadlines into your DB fields
function mapDeadlines(deadlines: { name: string; date: string | null }[]) {
  const m: Record<string, string | null> = {
    inspection_date: null,
    inspection_response_date: null,
    appraisal_date: null,
    loan_contingency_date: null,
    final_walkthrough_date: null,
    closing_date: null,
  };

  deadlines.forEach((d) => {
    const n = d.name.toLowerCase();
    if (n.includes("inspection response")) m.inspection_response_date = d.date;
    else if (n.includes("inspection")) m.inspection_date = d.date;
    else if (n.includes("appraisal")) m.appraisal_date = d.date;
    else if (n.includes("loan") || n.includes("financing")) m.loan_contingency_date = d.date;
    else if (n.includes("walk")) m.final_walkthrough_date = d.date;
    else if (n.includes("close") || n.includes("settle")) m.closing_date = d.date;
  });

  return m;
}

async function updateContractRecord(
  contractId: string,
  userId: string,
  summary: any,
  summaryPath: string
) {
  const deadlines = mapDeadlines(summary.deadlines);

  await supabase.from("contracts").update({
    buyer_name: summary.parties?.buyer ?? null,
    seller_name: summary.parties?.seller ?? null,
    agent_notes: summary.executive_summary ?? null,
    inspection_date: deadlines.inspection_date,
    inspection_response_date: deadlines.inspection_response_date,
    appraisal_date: deadlines.appraisal_date,
    loan_contingency_date: deadlines.loan_contingency_date,
    final_walkthrough_date: deadlines.final_walkthrough_date,
    closing_date: deadlines.closing_date,
    ai_summary: summary.executive_summary,
    summary_path: summaryPath,
    updated_at: new Date().toISOString(),
  })
    .eq("id", contractId)
    .eq("user_id", userId);
}

// ============================================================================
// END OF FILE
// ============================================================================
