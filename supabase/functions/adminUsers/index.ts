import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const appUrl = Deno.env.get('APP_URL') ?? 'https://contractflowai.us/reset-password'

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contractflowai.us',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = (await req.json()) ?? {}

    if (!action) {
      return jsonResponse(400, { error: 'Action is required' })
    }

    switch (action) {
      case 'listUsers': {
        const { data, error } = await supabase.auth.admin.listUsers()
        if (error) throw error
        return jsonResponse(200, { users: data?.users ?? [] })
      }
      case 'createUser': {
        const { email, password, fullName } = payload ?? {}
        if (!email || !password) {
          return jsonResponse(400, { error: 'Email and password required' })
        }
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName ?? '' }
        })
        if (error) throw error
        return jsonResponse(200, { user: data.user })
      }
      case 'resetPassword': {
        const { userId } = payload ?? {}
        if (!userId) {
          return jsonResponse(400, { error: 'userId required' })
        }
        const { data, error } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          user_id: userId,
          options: {
            redirect_to: appUrl
          }
        })
        if (error) throw error
        return jsonResponse(200, { link: data.properties?.action_link ?? null })
      }
      case 'blockUser': {
        const { userId, banned = true } = payload ?? {}
        if (!userId) {
          return jsonResponse(400, { error: 'userId required' })
        }
        const { data, error } = await supabase.auth.admin.updateUserById(userId, { banned })
        if (error) throw error
        return jsonResponse(200, { user: data })
      }
      default:
        return jsonResponse(400, { error: `Unsupported action: ${action}` })
    }
  } catch (error) {
    console.error('[adminUsers:error]', error)
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) })
  }
})

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
