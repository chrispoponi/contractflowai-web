import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.57.0";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

const CONTRACTS_BUCKET = "contracts";
const SUMMARY_FOLDER = "summaries";
const PROMPT_VERSION = "pdf-text+date-candidates+llm-normalize:v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DateCandidate = {
  raw: string;
  context: string;
  line: number;
  page: number | null;
};

type ExtractedField<T> = {
  value: T;
  confidence: number; // 0..1
  evidence: string;
};

type NormalizedOutput = {
  executive_summary: string;
  property_address: ExtractedField<string | null>;
  buyer_name: ExtractedField<string | null>;
  buyer_email: ExtractedField<string | null>;
  seller_name: ExtractedField<string | null>;
  seller_email: ExtractedField<string | null>;
  purchase_price: ExtractedField<string | null>;
  earnest_money: ExtractedField<string | null>;
  is_counter_offer: ExtractedField<boolean>;
  counter_offer_number: ExtractedField<number | null>;
  dates: {
    contract_date: ExtractedField<string | null>; // ISO date
    inspection_date: ExtractedField<string | null>;
    inspection_response_date: ExtractedField<string | null>;
    loan_contingency_date: ExtractedField<string | null>;
    appraisal_date: ExtractedField<string | null>;
    final_walkthrough_date: ExtractedField<string | null>;
    closing_date: ExtractedField<string | null>;
  };
  needs_review: boolean;
};

const DATE_REGEX =
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi;

function clamp01(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>).map((i) => i.str ?? "")
      .filter(Boolean)
      .join(" ");
    fullText += `\n--- PAGE ${pageNum} ---\n${pageText}`;
  }

  return normalizeWhitespace(fullText);
}

function extractDateCandidates(text: string, maxCandidates = 250): DateCandidate[] {
  const candidates: DateCandidate[] = [];
  const lines = text.split("\n");
  let currentPage: number | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? "";
    const pageMatch = line.match(/--- PAGE (\d+) ---/);
    if (pageMatch) {
      currentPage = Number(pageMatch[1]);
      continue;
    }

    const matches = line.match(DATE_REGEX);
    if (!matches) continue;

    for (const raw of matches) {
      candidates.push({
        raw,
        context: line.trim(),
        line: idx + 1,
        page: currentPage,
      });
      if (candidates.length >= maxCandidates) return candidates;
    }
  }

  return candidates;
}

function safeJsonParse(raw: string): unknown {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try to recover if model wrapped JSON in text.
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const slice = trimmed.slice(first, last + 1);
      return JSON.parse(slice);
    }
    throw new Error("LLM did not return valid JSON");
  }
}

function buildNormalizationPrompt(text: string, candidates: DateCandidate[]) {
  const prompt = `
You are a real estate contract analysis engine.

Task:
1) Identify the correct contractual dates using the provided date candidates and contract text.
2) Normalize all dates to ISO format (YYYY-MM-DD).
3) Provide confidence (0.0–1.0).
4) Provide a short evidence snippet copied verbatim from the contract text.

Rules:
- Do NOT invent data. If unsure, set value/date = null and confidence <= 0.4.
- Evidence must appear in the Contract Text excerpt provided.
- Only return valid JSON. No markdown, no commentary.

Contract Text (excerpt, may be truncated):
${text.slice(0, 16000)}

Date Candidates (with context):
${JSON.stringify(candidates, null, 2)}

Return JSON using EXACTLY this schema:
{
  "executive_summary": "string",
  "property_address": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "buyer_name": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "buyer_email": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "seller_name": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "seller_email": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "purchase_price": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "earnest_money": { "value": "string|null", "confidence": 0.0, "evidence": "string" },
  "is_counter_offer": { "value": true, "confidence": 0.0, "evidence": "string" },
  "counter_offer_number": { "value": 0, "confidence": 0.0, "evidence": "string" },
  "dates": {
    "contract_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" },
    "inspection_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" },
    "inspection_response_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" },
    "loan_contingency_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" },
    "appraisal_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" },
    "final_walkthrough_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" },
    "closing_date": { "value": "YYYY-MM-DD|null", "confidence": 0.0, "evidence": "string" }
  },
  "needs_review": true
}
`;
  return prompt.trim();
}

function inferNeedsReview(output: NormalizedOutput) {
  const checks: Array<{ conf: number; hasValue: boolean }> = [];
  const push = (field: ExtractedField<unknown>) => {
    checks.push({ conf: clamp01(field?.confidence, 0), hasValue: field?.value !== null && field?.value !== "" });
  };

  push(output.property_address);
  push(output.buyer_name);
  push(output.seller_name);
  push(output.purchase_price);
  push(output.earnest_money);
  push(output.dates.contract_date);
  push(output.dates.inspection_date);
  push(output.dates.inspection_response_date);
  push(output.dates.loan_contingency_date);
  push(output.dates.appraisal_date);
  push(output.dates.final_walkthrough_date);
  push(output.dates.closing_date);

  // Needs review if anything critical is missing or low-confidence.
  const missingCritical = [
    output.property_address.value,
    output.dates.closing_date.value,
  ].some((v) => v === null || v === "");

  const lowConfidence = checks.some((c) => !c.hasValue ? c.conf > 0.4 : c.conf < 0.6);
  return Boolean(missingCritical || lowConfidence);
}

function buildLegacyFlatExtracted(output: NormalizedOutput) {
  return {
    property_address: output.property_address.value ?? "",
    buyer_name: output.buyer_name.value ?? "",
    buyer_email: output.buyer_email.value ?? "",
    seller_name: output.seller_name.value ?? "",
    seller_email: output.seller_email.value ?? "",
    purchase_price: output.purchase_price.value ?? "",
    earnest_money: output.earnest_money.value ?? "",
    contract_date: output.dates.contract_date.value ?? "",
    inspection_date: output.dates.inspection_date.value ?? "",
    inspection_response_date: output.dates.inspection_response_date.value ?? "",
    loan_contingency_date: output.dates.loan_contingency_date.value ?? "",
    appraisal_date: output.dates.appraisal_date.value ?? "",
    final_walkthrough_date: output.dates.final_walkthrough_date.value ?? "",
    closing_date: output.dates.closing_date.value ?? "",
    is_counter_offer: Boolean(output.is_counter_offer.value),
    counter_offer_number: output.counter_offer_number.value ?? null,
    original_contract_id: null,
    plain_language_summary: output.executive_summary ?? "",
  };
}

function buildParsedContractForUI(output: NormalizedOutput) {
  const title = output.property_address.value ?? null;
  const parsedContract = {
    title,
    property_address: output.property_address.value ?? null,
    client_name: output.buyer_name.value ?? output.seller_name.value ?? null,
    buyer_name: output.buyer_name.value ?? null,
    buyer_email: output.buyer_email.value ?? null,
    seller_name: output.seller_name.value ?? null,
    seller_email: output.seller_email.value ?? null,
    purchase_price: output.purchase_price.value ?? null,
    earnest_money: output.earnest_money.value ?? null,
    contract_date: output.dates.contract_date.value ?? null,
    closing_date: output.dates.closing_date.value ?? null,
    inspection_date: output.dates.inspection_date.value ?? null,
    inspection_response_date: output.dates.inspection_response_date.value ?? null,
    loan_contingency_date: output.dates.loan_contingency_date.value ?? null,
    appraisal_date: output.dates.appraisal_date.value ?? null,
    final_walkthrough_date: output.dates.final_walkthrough_date.value ?? null,
    summary: output.executive_summary ?? null,
  };
  return parsedContract;
}

function buildFieldMeta(output: NormalizedOutput) {
  const meta = {
    title: { source: "ai", confidence: clamp01(output.property_address.confidence, 0.5), needsVerification: false, reason: "Derived from property address" },
    property_address: { source: "ai", confidence: clamp01(output.property_address.confidence), needsVerification: clamp01(output.property_address.confidence) < 0.6, reason: output.property_address.evidence || "LLM extracted" },
    client_name: { source: "ai", confidence: Math.max(clamp01(output.buyer_name.confidence), clamp01(output.seller_name.confidence)), needsVerification: false, reason: "Derived from buyer/seller" },
    buyer_name: { source: "ai", confidence: clamp01(output.buyer_name.confidence), needsVerification: clamp01(output.buyer_name.confidence) < 0.6, reason: output.buyer_name.evidence || "LLM extracted" },
    buyer_email: { source: "ai", confidence: clamp01(output.buyer_email.confidence), needsVerification: clamp01(output.buyer_email.confidence) < 0.6, reason: output.buyer_email.evidence || "LLM extracted" },
    seller_name: { source: "ai", confidence: clamp01(output.seller_name.confidence), needsVerification: clamp01(output.seller_name.confidence) < 0.6, reason: output.seller_name.evidence || "LLM extracted" },
    seller_email: { source: "ai", confidence: clamp01(output.seller_email.confidence), needsVerification: clamp01(output.seller_email.confidence) < 0.6, reason: output.seller_email.evidence || "LLM extracted" },
    purchase_price: { source: "ai", confidence: clamp01(output.purchase_price.confidence), needsVerification: clamp01(output.purchase_price.confidence) < 0.6, reason: output.purchase_price.evidence || "LLM extracted" },
    earnest_money: { source: "ai", confidence: clamp01(output.earnest_money.confidence), needsVerification: clamp01(output.earnest_money.confidence) < 0.6, reason: output.earnest_money.evidence || "LLM extracted" },
    contract_date: { source: "ai", confidence: clamp01(output.dates.contract_date.confidence), needsVerification: clamp01(output.dates.contract_date.confidence) < 0.6, reason: output.dates.contract_date.evidence || "LLM extracted" },
    closing_date: { source: "ai", confidence: clamp01(output.dates.closing_date.confidence), needsVerification: clamp01(output.dates.closing_date.confidence) < 0.6, reason: output.dates.closing_date.evidence || "LLM extracted" },
    inspection_date: { source: "ai", confidence: clamp01(output.dates.inspection_date.confidence), needsVerification: clamp01(output.dates.inspection_date.confidence) < 0.6, reason: output.dates.inspection_date.evidence || "LLM extracted" },
    inspection_response_date: { source: "ai", confidence: clamp01(output.dates.inspection_response_date.confidence), needsVerification: clamp01(output.dates.inspection_response_date.confidence) < 0.6, reason: output.dates.inspection_response_date.evidence || "LLM extracted" },
    loan_contingency_date: { source: "ai", confidence: clamp01(output.dates.loan_contingency_date.confidence), needsVerification: clamp01(output.dates.loan_contingency_date.confidence) < 0.6, reason: output.dates.loan_contingency_date.evidence || "LLM extracted" },
    appraisal_date: { source: "ai", confidence: clamp01(output.dates.appraisal_date.confidence), needsVerification: clamp01(output.dates.appraisal_date.confidence) < 0.6, reason: output.dates.appraisal_date.evidence || "LLM extracted" },
    final_walkthrough_date: { source: "ai", confidence: clamp01(output.dates.final_walkthrough_date.confidence), needsVerification: clamp01(output.dates.final_walkthrough_date.confidence) < 0.6, reason: output.dates.final_walkthrough_date.evidence || "LLM extracted" },
    summary: { source: "ai", confidence: 0.8, needsVerification: false, reason: "Generated executive summary" },
  } as Record<string, unknown>;

  return meta;
}

function buildNeedsVerificationKeys(output: NormalizedOutput) {
  const keys: string[] = [];
  const maybe = (key: string, field: ExtractedField<unknown>) => {
    const conf = clamp01(field?.confidence, 0);
    const hasValue = field?.value !== null && field?.value !== "";
    if (!hasValue || conf < 0.6) keys.push(key);
  };

  maybe("property_address", output.property_address);
  maybe("buyer_name", output.buyer_name);
  maybe("buyer_email", output.buyer_email);
  maybe("seller_name", output.seller_name);
  maybe("seller_email", output.seller_email);
  maybe("purchase_price", output.purchase_price);
  maybe("earnest_money", output.earnest_money);
  maybe("contract_date", output.dates.contract_date);
  maybe("closing_date", output.dates.closing_date);
  maybe("inspection_date", output.dates.inspection_date);
  maybe("inspection_response_date", output.dates.inspection_response_date);
  maybe("loan_contingency_date", output.dates.loan_contingency_date);
  maybe("appraisal_date", output.dates.appraisal_date);
  maybe("final_walkthrough_date", output.dates.final_walkthrough_date);
  // title/client_name/summary are derived; we don't force review by default.
  return keys;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Incoming payload:", body);

    const { contractId, storagePath, userId, persist } = body ?? {};
    const shouldPersist = persist !== false; // default true

    if (!storagePath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("PDF download error:", downloadError);
      throw new Error("Unable to download PDF");
    }

    const pdfBytes = await fileData.arrayBuffer();
    let extractedText = "";
    let usedFallback = false;
    let primaryError: string | null = null;

    try {
      extractedText = await extractTextFromPDF(pdfBytes);
    } catch (err) {
      usedFallback = true;
      primaryError = err instanceof Error ? err.message : String(err);
      console.error("PDF.js text extraction failed:", primaryError);
      extractedText = "";
    }

    const candidates = extractDateCandidates(extractedText);

    let normalized: NormalizedOutput | null = null;
    if (extractedText) {
      const prompt = buildNormalizationPrompt(extractedText, candidates);

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: "You are a strict JSON generator. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
      });

      const raw = aiResponse.choices?.[0]?.message?.content ?? "";
      const parsed = safeJsonParse(raw) as Partial<NormalizedOutput>;
      normalized = parsed as NormalizedOutput;
    }

    if (!normalized) {
      // If deterministic extraction failed, fall back to the previous PDF->LLM method.
      usedFallback = true;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are an expert real estate contract analyst. Return ONLY valid JSON.\nPROMPT_VERSION=${PROMPT_VERSION}\n`,
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analyze this contract and extract key parties, amounts, and dates. Return JSON only." },
              { type: "input_file", mime_type: "application/pdf", data: Array.from(new Uint8Array(pdfBytes)) },
            ],
          },
        ],
      });

      const extractedFallback = safeJsonParse(aiResponse.choices?.[0]?.message?.content ?? "") as Record<string, unknown>;
      const fallbackSummary = typeof extractedFallback.plain_language_summary === "string"
        ? extractedFallback.plain_language_summary
        : typeof extractedFallback.executive_summary === "string"
        ? extractedFallback.executive_summary
        : "";

      normalized = {
        executive_summary: fallbackSummary || "Summary unavailable.",
        property_address: { value: asStringOrNull(extractedFallback.property_address), confidence: 0.4, evidence: "" },
        buyer_name: { value: asStringOrNull(extractedFallback.buyer_name), confidence: 0.4, evidence: "" },
        buyer_email: { value: asStringOrNull(extractedFallback.buyer_email), confidence: 0.4, evidence: "" },
        seller_name: { value: asStringOrNull(extractedFallback.seller_name), confidence: 0.4, evidence: "" },
        seller_email: { value: asStringOrNull(extractedFallback.seller_email), confidence: 0.4, evidence: "" },
        purchase_price: { value: asStringOrNull(extractedFallback.purchase_price), confidence: 0.4, evidence: "" },
        earnest_money: { value: asStringOrNull(extractedFallback.earnest_money), confidence: 0.4, evidence: "" },
        is_counter_offer: { value: Boolean(extractedFallback.is_counter_offer), confidence: 0.4, evidence: "" },
        counter_offer_number: { value: typeof extractedFallback.counter_offer_number === "number" ? extractedFallback.counter_offer_number : null, confidence: 0.4, evidence: "" },
        dates: {
          contract_date: { value: asStringOrNull(extractedFallback.contract_date), confidence: 0.4, evidence: "" },
          inspection_date: { value: asStringOrNull(extractedFallback.inspection_date), confidence: 0.4, evidence: "" },
          inspection_response_date: { value: asStringOrNull(extractedFallback.inspection_response_date), confidence: 0.4, evidence: "" },
          loan_contingency_date: { value: asStringOrNull(extractedFallback.loan_contingency_date), confidence: 0.4, evidence: "" },
          appraisal_date: { value: asStringOrNull(extractedFallback.appraisal_date), confidence: 0.4, evidence: "" },
          final_walkthrough_date: { value: asStringOrNull(extractedFallback.final_walkthrough_date), confidence: 0.4, evidence: "" },
          closing_date: { value: asStringOrNull(extractedFallback.closing_date), confidence: 0.4, evidence: "" },
        },
        needs_review: true,
      };
    }

    normalized.needs_review = normalized.needs_review ?? inferNeedsReview(normalized);

    const parsedContract = buildParsedContractForUI(normalized);
    const fieldMeta = buildFieldMeta(normalized);
    const needsVerification = buildNeedsVerificationKeys(normalized);

    const summaryForUI = {
      executive_summary: normalized.executive_summary ?? "",
      parties: {
        buyer: normalized.buyer_name?.value ?? null,
        seller: normalized.seller_name?.value ?? null,
        agents: null,
      },
      deadlines: [
        { name: "Contract Date", date: normalized.dates.contract_date?.value ?? null },
        { name: "Inspection", date: normalized.dates.inspection_date?.value ?? null },
        { name: "Inspection Response", date: normalized.dates.inspection_response_date?.value ?? null },
        { name: "Loan Contingency", date: normalized.dates.loan_contingency_date?.value ?? null },
        { name: "Appraisal", date: normalized.dates.appraisal_date?.value ?? null },
        { name: "Final Walkthrough", date: normalized.dates.final_walkthrough_date?.value ?? null },
        { name: "Closing", date: normalized.dates.closing_date?.value ?? null },
      ],
      risks: [],
      dates: normalized.dates,
      needs_review: normalized.needs_review ?? true,
    };

    const summaryPath = contractId ? `${SUMMARY_FOLDER}/${contractId}/summary.json` : null;
    const metadataPath = contractId ? `${SUMMARY_FOLDER}/${contractId}/metadata.json` : null;
    const rawTextPath = contractId ? `${SUMMARY_FOLDER}/${contractId}/raw_text.txt` : null;
    const candidatesPath = contractId ? `${SUMMARY_FOLDER}/${contractId}/candidates.json` : null;

    if (contractId) {
      // Always store artifacts for debugging when we have a stable contractId.
      const metadata = {
        prompt_version: PROMPT_VERSION,
        model: "gpt-4o-mini",
        generated_at: new Date().toISOString(),
        usedFallback,
        primaryError,
        text_length: extractedText.length,
        candidate_count: candidates.length,
      };

      await Promise.all([
        summaryPath
          ? supabase.storage.from(CONTRACTS_BUCKET).upload(
              summaryPath,
              new Blob([JSON.stringify(summaryForUI, null, 2)], { type: "application/json" }),
              { upsert: true }
            )
          : Promise.resolve(),
        metadataPath
          ? supabase.storage.from(CONTRACTS_BUCKET).upload(
              metadataPath,
              new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
              { upsert: true }
            )
          : Promise.resolve(),
        rawTextPath
          ? supabase.storage.from(CONTRACTS_BUCKET).upload(
              rawTextPath,
              new Blob([extractedText], { type: "text/plain" }),
              { upsert: true }
            )
          : Promise.resolve(),
        candidatesPath
          ? supabase.storage.from(CONTRACTS_BUCKET).upload(
              candidatesPath,
              new Blob([JSON.stringify(candidates, null, 2)], { type: "application/json" }),
              { upsert: true }
            )
          : Promise.resolve(),
      ]);
    }

    // Persist into contracts table only when requested AND we have a contractId.
    if (shouldPersist && contractId) {
      const legacy = buildLegacyFlatExtracted(normalized);
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          property_address: legacy.property_address || null,
          buyer_name: legacy.buyer_name || null,
          buyer_email: legacy.buyer_email || null,
          seller_name: legacy.seller_name || null,
          seller_email: legacy.seller_email || null,
          purchase_price: legacy.purchase_price || null,
          earnest_money: legacy.earnest_money || null,
          contract_date: legacy.contract_date || null,
          inspection_date: legacy.inspection_date || null,
          inspection_response_date: legacy.inspection_response_date || null,
          loan_contingency_date: legacy.loan_contingency_date || null,
          appraisal_date: legacy.appraisal_date || null,
          final_walkthrough_date: legacy.final_walkthrough_date || null,
          closing_date: legacy.closing_date || null,
          is_counter_offer: legacy.is_counter_offer ?? false,
          counter_offer_number: legacy.counter_offer_number ?? null,
          plain_language_summary: legacy.plain_language_summary || "",
          ai_summary: legacy.plain_language_summary || "",
          summary_path: summaryPath,
          status: usedFallback ? "parsed_fallback" : "parsed_primary",
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("DB update error:", updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contractId: contractId ?? null,
        summaryPath,
        extracted: buildLegacyFlatExtracted(normalized),
        parsedContract,
        fieldMeta,
        needsVerification,
        diagnostics: {
          parser: usedFallback ? "vision-fallback" : "primary",
          usedFallback,
          primaryError,
          regexApplied: true,
          deadlineRulesApplied: false,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Parser error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
