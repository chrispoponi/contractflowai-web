import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://contractflowai.us",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, summary, contractId } = body ?? {};

    if (!email || !summary) {
      return new Response(JSON.stringify({ error: "Missing email or summary" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const payload = {
      from: "ContractFlowAI <no-reply@contractflowai.us>",
      to: email,
      subject: "Contract Summary",
      html: `
        <h2>Contract Summary</h2>
        <p>${String(summary).replace(/\n/g, "<br/>")}</p>
        <hr />
        <p>Contract ID: ${contractId ?? "N/A"}</p>
      `
    };

    const resendReq = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resendResp = await resendReq.json();

    if (!resendReq.ok) {
      console.error("[sendContractEmail] Resend error:", resendResp);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    await supabase
      .from("feedback")
      .insert({
        topic: "contract_email_sent",
        message: null,
        error_message: null,
        sentiment: "positive",
        user_id: null,
        raw_payload: JSON.stringify({ contractId, email, resendId: resendResp.id }).slice(0, 8000),
        created_at: new Date().toISOString()
      })
      .catch((error) => console.error("[sendContractEmail] feedback insert failed", error));

    return new Response(JSON.stringify({ success: true, id: resendResp.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[sendContractEmail] function error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
