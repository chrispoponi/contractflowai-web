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
    const primaryResult = normalizeAndValidate(summaryData);

    if (!primaryResult.valid) {
      console.warn("⚠️ Primary parser validation failed", primaryResult.errors);
    }

    const finalSummary =
      primaryResult.valid && primaryResult.summary
        ? primaryResult.summary
        : await runFallbackExtractor(fileData);

    if (!finalSummary) {
      return new Response(
        JSON.stringify({ error: "Unable to parse contract." }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log("🤖 Parsed contract summary:", finalSummary);

    // -----------------------------------------------------------------------
    // 3. Save JSON summary to Supabase Storage
    // -----------------------------------------------------------------------
    const summaryPath = `${SUMMARY_FOLDER}/${contractId}/summary.json`;

    const { error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(
        summaryPath,
        new Blob([JSON.stringify(finalSummary, null, 2)], {
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
        ai_summary: finalSummary.executive_summary,
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
    return new Response(JSON.stringify(finalSummary), {
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

async function runFallbackExtractor(fileData: Blob): Promise<NormalizedSummary | null> {
  try {
    const text = await fileData.text();
    if (!text || text.replace(/\s+/g, "").length < 200) {
      return null;
    }

    const findField = (label: string) => {
      const regex = new RegExp(`${label}\\s*[:\\-]\\s*(.+)`, "i");
      const match = text.match(regex);
      return match?.[1]?.split("\n")[0]?.trim() ?? null;
    };

    const candidateDates = [
      { name: "Inspection", label: "Inspection Date" },
      { name: "Appraisal", label: "Appraisal Date" },
      { name: "Loan Contingency", label: "Loan Contingency Date" },
      { name: "Closing", label: "Closing Date" }
    ];

    const deadlines = candidateDates
      .map(({ name, label }) => {
        const raw = findField(label);
        if (!raw) return null;
        return { name, date: normalizeDate(raw) };
      })
      .filter(Boolean) as { name: string; date: string | null }[];

    return {
      executive_summary: findField("Summary") || "Contract summary pending detailed review.",
      parties: {
        buyer: findField("Buyer"),
        seller: findField("Seller"),
        agents: findField("Agent")
      },
      deadlines,
      risks: []
    };
  } catch (error) {
    console.error("Fallback extractor failed:", error);
    return null;
  }
}
