import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.57.0";

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

// Helper function to normalize dates to YYYY-MM-DD format
function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr === "" || dateStr === "UNCERTAIN") return null;
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn("Could not parse date:", dateStr);
  }
  
  // Try MM/DD/YYYY format
  const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDateMatch) {
    const [, month, day, year] = usDateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildParserPrompt() {
  return `
You are an expert real estate contract analyst specializing in accurate date extraction.

Extract fields **exactly** in this JSON shape:

{
  "property_address": "",
  "buyer_name": "",
  "buyer_email": "",
  "seller_name": "",
  "seller_email": "",
  "purchase_price": "",
  "earnest_money": "",
  "contract_date": "",
  "inspection_date": "",
  "inspection_response_date": "",
  "loan_contingency_date": "",
  "appraisal_date": "",
  "final_walkthrough_date": "",
  "closing_date": "",
  "is_counter_offer": false,
  "counter_offer_number": null,
  "original_contract_id": null,
  "plain_language_summary": "",
  "_uncertain_fields": []
}

CRITICAL DATE EXTRACTION RULES:
1. READ THE DOCUMENT CAREFULLY - Look for dates in ALL sections
2. Dates in real estate contracts appear in many formats:
   - "January 15, 2025" or "Jan 15, 2025"
   - "1/15/2025" or "01/15/2025"
   - "15th day of January, 2025"
   - "Within X days of contract date" (calculate from contract_date)
   - "On or before [date]"
3. ALWAYS convert ALL dates to YYYY-MM-DD format (e.g., 2025-01-15)
4. For relative dates like "within 10 days of contract date", calculate the actual date

COMMON DATE LOCATIONS IN CONTRACTS:
- Contract/Effective Date: Usually at the top or in signature section
- Closing Date: Look for "Settlement", "Closing", "Close of Escrow"
- Inspection Date: Look for "Inspection Period", "Due Diligence", "Option Period"
- Inspection Response: Look for "Objection Deadline", "Resolution Period"
- Loan Contingency: Look for "Financing Contingency", "Loan Approval"
- Appraisal: Look for "Appraisal Contingency"
- Final Walkthrough: Often 24-48 hours before closing or specified separately

OTHER RULES:
- If a date is not found or you're uncertain, add the field name to _uncertain_fields array
- If not found, return "" (empty string), not null
- If multiple buyers/sellers, return primary one
- Detect if the document is an Amendment OR Counteroffer:
  • If so, set is_counter_offer = true and counter_offer_number = number detected
  • The frontend will assign original_contract_id later
- plain_language_summary = 3–6 sentence human-readable summary focusing on price, key dates, and special conditions
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Incoming payload:", body);

    const { contractId, storagePath, userId } = body;

    if (!contractId || !storagePath || !userId) {
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

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: buildParserPrompt(),
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze this contract and extract all fields.",
            },
            {
              type: "input_file",
              mime_type: "application/pdf",
              data: Array.from(new Uint8Array(pdfBytes)),
            },
          ],
        },
      ],
    });

    const rawExtracted = JSON.parse(aiResponse.choices[0].message.content ?? "{}");
    console.log("AI extraction (raw):", rawExtracted);
    
    // Normalize all date fields
    const dateFields = [
      'contract_date', 'inspection_date', 'inspection_response_date',
      'loan_contingency_date', 'appraisal_date', 'final_walkthrough_date', 'closing_date'
    ];
    
    const uncertainFields: string[] = rawExtracted._uncertain_fields || [];
    
    // Process and normalize dates, track which ones couldn't be parsed
    const extracted = { ...rawExtracted };
    for (const field of dateFields) {
      const rawDate = rawExtracted[field];
      const normalizedDate = normalizeDate(rawDate);
      extracted[field] = normalizedDate || "";
      
      // If we couldn't normalize a non-empty date, mark it uncertain
      if (rawDate && !normalizedDate && !uncertainFields.includes(field)) {
        uncertainFields.push(field);
        console.warn(`Date normalization failed for ${field}: ${rawDate}`);
      }
    }
    
    extracted._uncertain_fields = uncertainFields;
    console.log("AI extraction (normalized):", extracted);

    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        property_address: extracted.property_address || null,
        buyer_name: extracted.buyer_name || null,
        buyer_email: extracted.buyer_email || null,
        seller_name: extracted.seller_name || null,
        seller_email: extracted.seller_email || null,
        purchase_price: extracted.purchase_price || null,
        earnest_money: extracted.earnest_money || null,
        contract_date: extracted.contract_date || null,
        inspection_date: extracted.inspection_date || null,
        inspection_response_date: extracted.inspection_response_date || null,
        loan_contingency_date: extracted.loan_contingency_date || null,
        appraisal_date: extracted.appraisal_date || null,
        final_walkthrough_date: extracted.final_walkthrough_date || null,
        closing_date: extracted.closing_date || null,
        is_counter_offer: extracted.is_counter_offer ?? false,
        counter_offer_number: extracted.counter_offer_number ?? null,
        plain_language_summary: extracted.plain_language_summary || "",
        ai_summary: extracted.plain_language_summary || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw updateError;
    }

    const summaryPath = `${SUMMARY_FOLDER}/${contractId}/summary.json`;

    await supabase.storage.from(CONTRACTS_BUCKET).upload(
      summaryPath,
      new Blob([JSON.stringify(extracted, null, 2)], {
        type: "application/json",
      }),
      { upsert: true }
    );

    return new Response(
      JSON.stringify({
        success: true,
        contractId,
        summaryPath,
        extracted,
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
