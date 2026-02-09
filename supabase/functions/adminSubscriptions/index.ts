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

type Action = 'list' | 'update' | 'quick-upgrade'

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

    const requesterId = authResult.user.id
    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', requesterId)
      .single()

    if (requesterError || requester?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { action = 'list', targetUserId, updates } = await req.json().catch(() => ({})) as {
      action?: Action
      targetUserId?: string
      updates?: Record<string, unknown>
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('users')
        .select(
          'id, email, full_name, role, subscription_tier, subscription_status, trial_end_date, subscription_notes, stripe_customer_id, created_at, updated_at'
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      return new Response(JSON.stringify({ users: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update') {
      if (!targetUserId || !updates) {
        return new Response(JSON.stringify({ error: 'targetUserId and updates required' }), { status: 400, headers: corsHeaders })
      }
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)
        .select(
          'id, email, full_name, role, subscription_tier, subscription_status, trial_end_date, subscription_notes, stripe_customer_id, created_at, updated_at'
        )
        .single()
      if (error) throw error
      return new Response(JSON.stringify({ user: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'quick-upgrade') {
      const { data, error } = await supabase
        .from('users')
        .update({
          subscription_tier: 'professional',
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', requesterId)
        .select(
          'id, email, full_name, role, subscription_tier, subscription_status, trial_end_date, subscription_notes, stripe_customer_id, created_at, updated_at'
        )
        .single()
      if (error) throw error
      return new Response(JSON.stringify({ user: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
