import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { encode as encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

type ParserDiagnostics = {
  parser: 'primary' | 'vision-fallback'
  usedFallback: boolean
  primaryError?: string | null
}

type NormalizedContract = {
  title: string | null
  property_address: string | null
  client_name: string | null
  buyer_name: string | null
  buyer_email: string | null
  seller_name: string | null
  seller_email: string | null
  purchase_price: string | null
  closing_date: string | null
  inspection_date: string | null
  inspection_response_date: string | null
  loan_contingency_date: string | null
  appraisal_date: string | null
  final_walkthrough_date: string | null
  summary: string | null
  risk_items: { severity?: string; description: string }[]
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

const CONTRACTS_BUCKET = Deno.env.get('CONTRACTS_BUCKET') ?? 'contracts'
const SUMMARY_FOLDER = 'summaries'

const PRIMARY_PARSER_URL = Deno.env.get('PRIMARY_PARSER_URL') ?? ''
const PRIMARY_PARSER_API_KEY = Deno.env.get('PRIMARY_PARSER_API_KEY') ?? ''
const VISION_FALLBACK_URL = Deno.env.get('VISION_FALLBACK_URL') ?? ''
const VISION_PARSER_API_KEY = Deno.env.get('VISION_PARSER_API_KEY') ?? ''
const PDF_TO_IMAGE_URL = Deno.env.get('PDF_TO_IMAGE_URL') ?? ''
const PDF_TO_IMAGE_API_KEY = Deno.env.get('PDF_TO_IMAGE_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contractflowai.us',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { contractId, storagePath, userId, persist = true } = body ?? {}

    if (!userId || !storagePath) {
      return response(
        400,
        { error: 'userId and storagePath are required' }
      )
    }

    const {
      fileBytes,
      mimeType
    } = await downloadFromStorage(storagePath)

    const diagnostics: ParserDiagnostics = {
      parser: 'primary',
      usedFallback: false,
      primaryError: null
    }

    let parsedContractRaw: Record<string, unknown> | null = null

    try {
      parsedContractRaw = await parseWithPrimary(fileBytes, mimeType)
    } catch (error) {
      diagnostics.usedFallback = true
      diagnostics.primaryError = error instanceof Error ? error.message : String(error)
      diagnostics.parser = 'vision-fallback'
      console.error('[PRIMARY_PARSER_FAILED]', {
        contractId,
        message: diagnostics.primaryError
      })
      parsedContractRaw = await parseWithFallback(fileBytes)
    }

    if (!parsedContractRaw) {
      throw new Error('Parser returned no data')
    }

    const normalized = normalizeParsedContract(parsedContractRaw)
    const summaryPath = await persistSummary(contractId, normalized, diagnostics)

    if (contractId && persist) {
      await updateContractRecord(contractId, userId, normalized, summaryPath)
    }

    return response(200, {
      parsedContract: normalized,
      riskItems: normalized.risk_items,
      diagnostics,
      summaryPath
    })
  } catch (error) {
    console.error('[CONTRACT_PARSING_ERROR]', error)
    return response(500, { error: error instanceof Error ? error.message : String(error) })
  }
})

async function downloadFromStorage(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw new Error(`Unable to download contract from storage: ${error?.message ?? 'Unknown error'}`)
  }

  const buffer = await data.arrayBuffer()
  const fileBytes = new Uint8Array(buffer)

  const inferredMime =
    (data.type && data.type !== '') ? data.type : 'application/pdf'

  return { fileBytes, mimeType: inferredMime }
}

async function parseWithPrimary(fileBytes: Uint8Array, mimeType: string) {
  if (!PRIMARY_PARSER_URL) {
    throw new Error('PRIMARY_PARSER_URL env var is not configured')
  }

  const payload = {
    document_base64: encodeBase64(fileBytes),
    mime_type: mimeType
  }

  const res = await fetch(PRIMARY_PARSER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PRIMARY_PARSER_API_KEY
        ? { Authorization: `Bearer ${PRIMARY_PARSER_API_KEY}` }
        : {})
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Primary parser failed (${res.status}): ${text}`)
  }

  return await res.json()
}

async function parseWithFallback(fileBytes: Uint8Array) {
  if (!VISION_FALLBACK_URL) {
    throw new Error('VISION_FALLBACK_URL env var is not configured')
  }

  console.warn('[VISION_FALLBACK_TRIGGERED]', {
    at: new Date().toISOString()
  })

  const images = await ensureImages(fileBytes)

  const res = await fetch(VISION_FALLBACK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(VISION_PARSER_API_KEY
        ? { Authorization: `Bearer ${VISION_PARSER_API_KEY}` }
        : {})
    },
    body: JSON.stringify({ images })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vision fallback failed (${res.status}): ${text}`)
  }

  return await res.json()
}

async function ensureImages(fileBytes: Uint8Array) {
  if (!PDF_TO_IMAGE_URL) {
    return [`data:application/pdf;base64,${encodeBase64(fileBytes)}`]
  }

  const res = await fetch(PDF_TO_IMAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      ...(PDF_TO_IMAGE_API_KEY ? { 'x-api-key': PDF_TO_IMAGE_API_KEY } : {})
    },
    body: fileBytes
  })

  if (!res.ok) {
    const text = await res.text()
    console.warn('[PDF_TO_IMAGE_FAILED]', text)
    return [`data:application/pdf;base64,${encodeBase64(fileBytes)}`]
  }

  const json = await res.json()
  if (!Array.isArray(json.images) || json.images.length === 0) {
    console.warn('[PDF_TO_IMAGE_EMPTY_RESPONSE]')
    return [`data:application/pdf;base64,${encodeBase64(fileBytes)}`]
  }

  return json.images
}

function normalizeParsedContract(raw: Record<string, unknown>): NormalizedContract {
  const get = (key: string) => {
    const value = raw[key]
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return String(value)
    return null
  }

  const riskItemsRaw = Array.isArray(raw['risk_items'])
    ? (raw['risk_items'] as { severity?: string; description?: string }[])
    : Array.isArray(raw['risks'])
    ? (raw['risks'] as { severity?: string; description?: string }[])
    : []

  const safeRiskItems = riskItemsRaw
    .filter((item) => typeof item?.description === 'string')
    .map((item) => ({
      severity: item?.severity ?? 'info',
      description: item?.description ?? ''
    }))

  return {
    title: get('title') ?? get('document_title'),
    property_address: get('property_address') ?? get('address'),
    client_name: get('client_name') ?? get('buyer_name'),
    buyer_name: get('buyer_name'),
    buyer_email: get('buyer_email'),
    seller_name: get('seller_name'),
    seller_email: get('seller_email'),
    purchase_price: get('purchase_price'),
    closing_date: get('closing_date'),
    inspection_date: get('inspection_date'),
    inspection_response_date: get('inspection_response_date'),
    loan_contingency_date: get('loan_contingency_date'),
    appraisal_date: get('appraisal_date'),
    final_walkthrough_date: get('final_walkthrough_date'),
    summary: get('executive_summary') ?? get('summary'),
    risk_items: safeRiskItems
  }
}

async function persistSummary(
  contractId: string | undefined,
  normalized: NormalizedContract,
  diagnostics: ParserDiagnostics
) {
  const summaryPayload = {
    generated_at: new Date().toISOString(),
    parsed_contract: normalized,
    diagnostics
  }

  const summaryKey = `${SUMMARY_FOLDER}/${contractId ?? crypto.randomUUID()}/summary.json`

  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(
      summaryKey,
      new Blob([JSON.stringify(summaryPayload)], {
        type: 'application/json'
      }),
      { upsert: true, cacheControl: '3600' }
    )

  if (error) {
    console.error('[SUMMARY_UPLOAD_FAILED]', error)
    return null
  }

  return summaryKey
}

async function updateContractRecord(
  contractId: string,
  userId: string,
  normalized: NormalizedContract,
  summaryPath: string | null
) {
  const { error } = await supabase
    .from('contracts')
    .update({
      ai_summary: normalized.summary,
      summary_path: summaryPath,
      updated_at: new Date().toISOString()
    })
    .eq('id', contractId)
    .eq('user_id', userId)

  if (error) {
    console.error('[CONTRACT_UPDATE_FAILED]', error)
  }
}

function response(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
