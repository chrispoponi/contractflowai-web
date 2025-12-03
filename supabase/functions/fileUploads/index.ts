import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

serve(async (req) => {
  try {
    const { bucket = 'contracts', path } = await req.json()
    if (!path) return new Response(JSON.stringify({ error: 'path required' }), { status: 400 })
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) return new Response(JSON.stringify({ error: error?.message ?? 'upload error' }), { status: 400 })
    return new Response(JSON.stringify({ signedUrl: data.signedUrl, token: data.token, bucket, path }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
