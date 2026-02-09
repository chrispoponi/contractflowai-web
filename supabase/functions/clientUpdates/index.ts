import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contractflowai.us',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'updates@contractflowai.com'
const RESEND_FROM_NAME = Deno.env.get('RESEND_FROM_NAME') ?? 'ContractFlowAI'

type RequestBody = {
  userId: string
  contractId: string
  updateType: string
  subject: string
  body: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { data: authResult, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authResult?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
    }

    const payload = (await req.json()) as RequestBody
    const { userId, contractId, updateType, subject, body } = payload
    if (!userId || !contractId || !updateType || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders })
    }

    if (authResult.user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, user_id, property_address, buyer_email, buyer_phone, buyer_name, closing_date')
      .eq('id', contractId)
      .eq('user_id', userId)
      .single()

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), { status: 404, headers: corsHeaders })
    }

    if (!contract.buyer_email) {
      return new Response(JSON.stringify({ error: 'Buyer email is required to send update' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, brokerage_name')
      .eq('id', userId)
      .single()

    const senderName = userProfile?.full_name ?? RESEND_FROM_NAME

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${senderName} <${RESEND_FROM_EMAIL}>`,
          to: [contract.buyer_email],
          subject,
          text: body,
          html: body.replace(/\n/g, '<br/>')
        })
      })
    }

    const { error: insertError } = await supabase.from('client_updates').insert({
      user_id: userId,
      contract_id: contractId,
      client_email: contract.buyer_email,
      client_phone: contract.buyer_phone ?? null,
      update_type: updateType,
      message: body,
      send_method: 'email',
      sent_date: new Date().toISOString(),
      is_sent: true
    })

    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
