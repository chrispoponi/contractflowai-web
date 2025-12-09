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
const RAW_FOLDER = "raw";
const MODEL_NAME = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1";
const FALLBACK_MODEL = Deno.env.get("OPENAI_FALLBACK_MODEL") ?? "gpt-4o-mini";
const MAX_TEXT_SNAPSHOT = 120_000;

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

const PRIMARY_PROMPT =
  "You are an expert real estate contract analyzer. Return ONLY valid JSON (no prose) that mirrors the provided schema. Extract all important deadlines, parties, clauses, risk factors, and generate a clean JSON timeline + executive summary. Use null for unknown fields.";

const FALLBACK_PROMPT =
  "You are a conservative contract analyst. Extract only fields that explicitly exist in the document. Use null when unsure. Return valid JSON that matches the schema exactly.";

type ParserStage = "primary" | "fallback" | "micro";

type ParseAttemptLog = {
  stage: ParserStage;
  model: string;
  success: boolean;
  duration_ms: number;
  error?: string;
};

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
  let requestUserId: string | null = null;
  let requestContractId: string | null = null;
  let requestStoragePath: string | null = null;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("📥 Incoming payload:", body);

    const { contractId, storagePath, userId } = body;
    requestContractId = contractId ?? null;
    requestStoragePath = storagePath ?? null;
    requestUserId = userId ?? null;

    if (!storagePath || !userId || !contractId) {
      return new Response(
        JSON.stringify({ error: "storagePath, contractId, and userId required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    await updateContractStatus(contractId, "uploaded");

    // -----------------------------------------------------------------------
    // 1. Download the PDF from Supabase Storage
    // -----------------------------------------------------------------------
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("❌ PDF download error:", downloadError);
      await updateContractStatus(contractId, "error");
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("📄 PDF downloaded successfully.");
    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    await persistRawDocument(contractId, fileBytes);
    await updateContractStatus(contractId, "text_extracted");

    // -----------------------------------------------------------------------
    // 2. Auto-retry parsing pipeline (primary -> fallback -> micro)
    // -----------------------------------------------------------------------
    const attempts: ParseAttemptLog[] = [];
    let finalSummary: NormalizedSummary | null = null;

    const primaryAttempt = await attemptParse("primary", MODEL_NAME, () =>
      parseWithModel(MODEL_NAME, fileBytes, PRIMARY_PROMPT)
    );
    attempts.push(primaryAttempt.log);

    if (primaryAttempt.summary) {
      finalSummary = primaryAttempt.summary;
      await updateContractStatus(contractId, "parsed_primary");
    } else {
      const fallbackAttempt = await attemptParse("fallback", FALLBACK_MODEL, () =>
        parseWithModel(FALLBACK_MODEL, fileBytes, FALLBACK_PROMPT)
      );
      attempts.push(fallbackAttempt.log);

      if (fallbackAttempt.summary) {
        finalSummary = fallbackAttempt.summary;
        await updateContractStatus(contractId, "parsed_fallback");
      } else {
        const microAttempt = await attemptParse("micro", "regex_extractor", () =>
          runMicroExtractorFromBytes(fileBytes)
        );
        attempts.push(microAttempt.log);
        if (microAttempt.summary) {
          finalSummary = microAttempt.summary;
          await updateContractStatus(contractId, "parsed_fallback");
        }
      }
    }

    if (!finalSummary) {
      await logError(requestUserId, "Auto-retry exhausted without result", {
        contractId,
        storagePath,
        attempts,
      });
      await updateContractStatus(contractId, "error");
      return new Response(
        JSON.stringify({
          error: "Unable to parse contract after retries.",
          attempts,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("🤖 Parsed contract summary:", finalSummary);

    // -----------------------------------------------------------------------
    // 3. Save JSON summary + metadata to Supabase Storage
    // -----------------------------------------------------------------------
    const summaryPath = await persistSummary(contractId, finalSummary);
    await persistMetadata(contractId, {
      generated_at: new Date().toISOString(),
      model: attempts.find((attempt) => attempt.success)?.model ?? MODEL_NAME,
      usedFallback: !attempts[0]?.success,
      deadlines_detected: finalSummary.deadlines.length,
      attempts,
    });
    await updateContractStatus(contractId, "validated");

    // -----------------------------------------------------------------------
    // 4. Update DB
    // -----------------------------------------------------------------------
    await updateContractRecord(contractId, userId, finalSummary, summaryPath);
    await updateContractStatus(contractId, "completed");

    // -----------------------------------------------------------------------
    // 5. Return results to frontend
    // -----------------------------------------------------------------------
    const deadlineMap = mapDeadlines(finalSummary.deadlines);

    return new Response(
      JSON.stringify({
        summary: finalSummary.executive_summary,
        deadlines: deadlineMap,
        contractId,
        attempts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("🔥 Function crashed:", error);
    await logError(requestUserId, String(error), { contractId: requestContractId, storagePath: requestStoragePath });
    if (requestContractId) {
      await updateContractStatus(requestContractId, "error");
    }
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function updateContractStatus(contractId: string, status: string) {
  const { error } = await supabase
    .from("contracts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", contractId);

  if (error) {
    console.error(`[STATUS_${status}_FAILED]`, error);
  }
}

async function persistRawDocument(contractId: string, bytes: Uint8Array) {
  const rawPath = `${SUMMARY_FOLDER}/${contractId}/${RAW_FOLDER}.txt`;
  const base64 = bytesToBase64(bytes);
  const payload = JSON.stringify(
    {
      stored_at: new Date().toISOString(),
      encoding: "base64",
      data: base64,
    },
    null,
    2
  );

  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(rawPath, new Blob([payload], { type: "application/json" }), {
      upsert: true,
    });

  if (error) {
    console.error("[RAW_UPLOAD_FAILED]", error);
  }
}

async function persistSummary(contractId: string, summary: NormalizedSummary) {
  const path = `${SUMMARY_FOLDER}/${contractId}/summary.json`;
  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(path, new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" }), {
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return path;
}

async function persistMetadata(contractId: string, metadata: Record<string, unknown>) {
  const path = `${SUMMARY_FOLDER}/${contractId}/metadata.json`;
  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(path, new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }), {
      upsert: true,
    });

  if (error) {
    console.error("[METADATA_UPLOAD_FAILED]", error);
  }
}

type AttemptResult = { summary: NormalizedSummary | null; log: ParseAttemptLog };

async function attemptParse(stage: ParserStage, model: string, fn: () => Promise<NormalizedSummary>): Promise<AttemptResult> {
  const started = performance.now();
  const log: ParseAttemptLog = {
    stage,
    model,
    success: false,
    duration_ms: 0,
  };

  try {
    const summary = await fn();
    log.success = true;
    log.duration_ms = Math.round(performance.now() - started);
    return { summary, log };
  } catch (error) {
    log.error = error instanceof Error ? error.message : String(error);
    log.duration_ms = Math.round(performance.now() - started);
    console.error(`[${stage.toUpperCase()}_FAILED]`, error);
    return { summary: null, log };
  }
}

async function parseWithModel(model: string, fileBytes: Uint8Array, prompt: string): Promise<NormalizedSummary> {
  const response = await openai.chat.completions.create({
    model,
    temperature: model === FALLBACK_MODEL ? 0.2 : 0.1,
    max_tokens: 8000,
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Analyze this real estate contract PDF and extract all key information for the schema.",
          },
          {
            type: "input_file",
            mime_type: "application/pdf",
            data: fileBytes,
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "contract_summary",
        schema: SUMMARY_SCHEMA,
        strict: true,
      },
    },
  });

  const messageContent = response.choices?.[0]?.message?.content;
  if (!messageContent) {
    throw new Error("Model returned empty response");
  }

  let parsedPayload: Record<string, unknown>;
  try {
    parsedPayload = JSON.parse(messageContent);
  } catch {
    throw new Error("Model response was not valid JSON");
  }

  const result = normalizeAndValidate(parsedPayload);
  if (!result.valid || !result.summary) {
    const errors = (result as { errors?: string[] }).errors ?? [];
    throw new Error(`Validation failed: ${errors.join(", ") || "unknown error"}`);
  }

  return result.summary;
}

async function updateContractRecord(
  contractId: string,
  userId: string,
  summary: NormalizedSummary,
  summaryPath: string
) {
  const deadlines = mapDeadlines(summary.deadlines);

  const payload = {
    buyer_name: summary.parties.buyer,
    seller_name: summary.parties.seller,
    agent_notes: summary.executive_summary,
    inspection_date: deadlines.inspection_date ?? null,
    inspection_response_date: deadlines.inspection_response_date ?? null,
    appraisal_date: deadlines.appraisal_date ?? null,
    loan_contingency_date: deadlines.loan_contingency_date ?? null,
    final_walkthrough_date: deadlines.final_walkthrough_date ?? null,
    closing_date: deadlines.closing_date ?? null,
    ai_summary: summary.executive_summary,
    summary_path: summaryPath,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("contracts")
    .update(payload)
    .eq("id", contractId)
    .eq("user_id", userId);

  if (error) {
    console.error("[CONTRACT_UPDATE_FAILED]", error);
  }
}

function mapDeadlines(deadlines: { name: string; date: string | null }[]) {
  const result: Record<string, string | null> = {
    inspection_date: null,
    inspection_response_date: null,
    appraisal_date: null,
    loan_contingency_date: null,
    final_walkthrough_date: null,
    closing_date: null,
  };

  deadlines.forEach(({ name, date }) => {
    const normalized = name.toLowerCase();
    if (normalized.includes("response")) {
      result.inspection_response_date = date;
    } else if (normalized.includes("inspection")) {
      result.inspection_date = date;
    } else if (normalized.includes("appraisal")) {
      result.appraisal_date = date;
    } else if (normalized.includes("loan") || normalized.includes("financing") || normalized.includes("contingency")) {
      result.loan_contingency_date = date;
    } else if (normalized.includes("walkthrough")) {
      result.final_walkthrough_date = date;
    } else if (normalized.includes("closing") || normalized.includes("settlement")) {
      result.closing_date = date;
    }
  });

  return result;
}

async function logError(userId: string | null, message: string, payload?: Record<string, unknown>) {
  try {
    await supabase.from("feedback").insert({
      user_id: userId,
      topic: "contract_parsing_error",
      sentiment: "negative",
      message: null,
      error_message: message,
      raw_payload: payload ? JSON.stringify(payload).slice(0, 8000) : null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[LOG_ERROR_FAILED]", err);
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
// -----------------------------------------------------------------------------
// Validation & Fallback Helpers
// -----------------------------------------------------------------------------

type NormalizedSummary = {
  executive_summary: string;
  parties: { buyer: string | null; seller: string | null; agents: string | null };
  deadlines: { name: string; date: string | null }[];
  risks: { severity: string; description: string }[];
};

function normalizeAndValidate(payload: Record<string, unknown>) {
  const errors: string[] = [];
  const executive_summary =
    typeof payload.executive_summary === "string" && payload.executive_summary.trim().length > 0
      ? payload.executive_summary.trim()
      : null;
  if (!executive_summary) errors.push("Missing executive_summary");

  const partiesRaw = payload.parties as Record<string, unknown> | undefined;
  const parties = {
    buyer: typeof partiesRaw?.buyer === "string" ? partiesRaw.buyer.trim() : null,
    seller: typeof partiesRaw?.seller === "string" ? partiesRaw.seller.trim() : null,
    agents: typeof partiesRaw?.agents === "string" ? partiesRaw.agents.trim() : null
  };

  const deadlines = Array.isArray(payload.deadlines)
    ? (payload.deadlines as any[])
        .map((deadline) => {
          const name = typeof deadline?.name === "string" ? deadline.name.trim() : null;
          const date = typeof deadline?.date === "string" ? normalizeDate(deadline.date) : null;
          return name ? { name, date } : null;
        })
        .filter(Boolean) as { name: string; date: string | null }[]
    : [];
  if (deadlines.length === 0) errors.push("No deadlines found");

  const risks = Array.isArray(payload.risks)
    ? (payload.risks as any[])
        .map((risk) => {
          if (typeof risk === "string") {
            return { severity: "info", description: risk };
          }
          if (risk && typeof risk.description === "string") {
            const severity = typeof risk.severity === "string" ? risk.severity.toLowerCase() : "info";
            return { severity, description: risk.description };
          }
          return null;
        })
        .filter(Boolean) as { severity: string; description: string }[]
    : [];

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const summary: NormalizedSummary = {
    executive_summary,
    parties,
    deadlines,
    risks
  };

  return { valid: true, summary };
}

function normalizeDate(raw: string) {
  const trimmed = raw.trim();
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toISOString().split("T")[0];
  }
  const slashMatch = trimmed.match(/(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})/);
  if (slashMatch) {
    const [, mm, dd, yyyy] = slashMatch;
    const normalizedYear = yyyy.length === 2 ? `20${yyyy}` : yyyy;
    return `${normalizedYear.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}

async function runMicroExtractorFromBytes(fileBytes: Uint8Array): Promise<NormalizedSummary> {
  const text = toTextSnapshot(fileBytes);
  if (!text || text.replace(/\s+/g, "").length < 40) {
    throw new Error("Insufficient text for micro extraction");
  }

  const cleaned = text.replace(/\0/g, " ");

  const findField = (labels: string[]): string | null => {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:\\-]\\s*(.+)`, "i");
      const match = cleaned.match(regex);
      if (match?.[1]) {
        return match[1].split(/\r?\n/)[0]?.trim() ?? null;
      }
    }
    return null;
  };

  const deadlineConfigs = [
    { name: "Inspection", keywords: ["inspection response", "inspection deadline", "inspection date"] },
    { name: "Appraisal", keywords: ["appraisal deadline", "appraisal date"] },
    { name: "Loan Contingency", keywords: ["loan contingency", "financing contingency", "loan approval"] },
    { name: "Final Walkthrough", keywords: ["final walkthrough", "walk-through date"] },
    { name: "Closing", keywords: ["closing date", "settlement date"] },
    { name: "Earnest Money", keywords: ["earnest money due", "earnest money deadline"] },
  ];

  const deadlines = deadlineConfigs
    .map(({ name, keywords }) => {
      const date = extractDateByKeywords(cleaned, keywords);
      if (!date) return null;
      return { name, date };
    })
    .filter(Boolean) as { name: string; date: string | null }[];

  const summaryParagraph =
    cleaned
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(" ") || "AI parser could not produce a full summary. Please review manually.";

  const risks: { severity: string; description: string }[] = [];
  if (!deadlines.find((d) => d.name.toLowerCase().includes("inspection"))) {
    risks.push({ severity: "warning", description: "Inspection date missing or unclear." });
  }
  if (!deadlines.find((d) => d.name.toLowerCase().includes("closing"))) {
    risks.push({ severity: "warning", description: "Closing date missing or unclear." });
  }

  return {
    executive_summary: summaryParagraph,
    parties: {
      buyer: findField(["Buyer", "Purchaser"]),
      seller: findField(["Seller", "Owner"]),
      agents: findField(["Agent", "Broker"]),
    },
    deadlines,
    risks,
  };
}

function toTextSnapshot(bytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let text = decoder.decode(bytes);
  if (text.length > MAX_TEXT_SNAPSHOT) {
    text = text.slice(0, MAX_TEXT_SNAPSHOT);
  }
  return text;
}

function extractDateByKeywords(text: string, keywords: string[]): string | null {
  for (const keyword of keywords) {
    const regex = new RegExp(
      `${keyword}[\\w\\s,:()\\-]{0,80}?((?:\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})|(?:\\d{4}-\\d{2}-\\d{2})|(?:[A-Za-z]{3,9}\\s+\\d{1,2},\\s+\\d{4}))`,
      "i"
    );
    const match = text.match(regex);
    if (match?.[1]) {
      const normalized = normalizeDate(match[1]);
      if (normalized) return normalized;
    }
  }
  return null;
}
