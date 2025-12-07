import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { encode as encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type RiskItem = { severity?: string; description: string }

type ParserDiagnostics = {
  parser: 'primary' | 'vision-fallback'
  usedFallback: boolean
  primaryError?: string | null
  regexApplied?: boolean
  deadlineRulesApplied?: boolean
}

type FieldSource = 'ai' | 'regex' | 'rule' | 'manual'

type FieldKey =
  | 'title'
  | 'property_address'
  | 'client_name'
  | 'buyer_name'
  | 'buyer_email'
  | 'seller_name'
  | 'seller_email'
  | 'purchase_price'
  | 'earnest_money'
  | 'contract_date'
  | 'closing_date'
  | 'inspection_date'
  | 'inspection_response_date'
  | 'loan_contingency_date'
  | 'appraisal_date'
  | 'final_walkthrough_date'
  | 'summary'

interface FieldMetaPublic {
  source: FieldSource
  confidence: number
  needsVerification: boolean
  reason?: string
}

interface FieldMetaInternal extends FieldMetaPublic {
  forceReview?: boolean
}

interface FieldState {
  values: Record<FieldKey, string | null>
  meta: Record<FieldKey, FieldMetaInternal>
}

// -----------------------------------------------------------------------------
// Constants & Clients
// -----------------------------------------------------------------------------

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
const PDF_TO_TEXT_URL = Deno.env.get('PDF_TO_TEXT_URL') ?? ''
const PDF_TO_TEXT_API_KEY = Deno.env.get('PDF_TO_TEXT_API_KEY') ?? ''

const VERIFICATION_THRESHOLD = 0.65
const MAX_WARNINGS = 2

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contractflowai.us',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// -----------------------------------------------------------------------------
// HTTP Handler
// -----------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { contractId, storagePath, userId, persist = true } = body ?? {}

    if (!storagePath || !userId) {
      console.error('[CONTRACT_PARSING_INVALID_BODY]', { storagePath, userId })
      return httpResponse(400, { error: 'storagePath and userId are required' })
    }

    const targetContractId = contractId ?? crypto.randomUUID()

    const { fileBytes, mimeType } = await downloadFromStorage(storagePath)
    const textContent = await extractPlainText(fileBytes, mimeType).catch(() => null)

    const diagnostics: ParserDiagnostics = {
      parser: 'primary',
      usedFallback: false,
      regexApplied: false,
      deadlineRulesApplied: false,
      primaryError: null
    }

    const fieldState = createFieldState()
    let rawAi: Record<string, unknown> | null = null
    let riskItems: RiskItem[] = []

    try {
      rawAi = await parseWithPrimary(fileBytes, mimeType)
      populateFromSource(fieldState, rawAi, 'ai', 0.92)
      riskItems = normalizeRiskItems(rawAi)
    } catch (error) {
      diagnostics.usedFallback = true
      diagnostics.primaryError = error instanceof Error ? error.message : String(error)
      console.error('[PRIMARY_PARSER_FAILED]', {
        contractId: targetContractId,
        error: diagnostics.primaryError
      })

      const fallbackRaw = await parseWithVisionFallback(fileBytes)
      rawAi = fallbackRaw ?? null
      if (fallbackRaw) {
        populateFromSource(fieldState, fallbackRaw, 'ai', 0.8)
        riskItems = normalizeRiskItems(fallbackRaw)
      }
    }

    if (textContent) {
      const regexFields = regexExtractFields(textContent)
      populateFromSource(fieldState, regexFields, 'regex', 0.78)
      diagnostics.regexApplied = Object.values(regexFields).some(Boolean)
    }

    const rulesApplied = applyDeadlineRules(fieldState)
    diagnostics.deadlineRulesApplied = rulesApplied

    const { values, meta, needsVerification } = finalizeFieldState(fieldState)

    const summaryPath = contractId
      ? await persistSummary(contractId, values, riskItems, diagnostics)
      : null

    if (persist && contractId) {
      await updateContractRecord(contractId, userId, values, summaryPath)
    }

    return httpResponse(200, {
      parsedContract: values,
      fieldMeta: meta,
      needsVerification,
      riskItems,
      risks: riskItems,
      summary: values.summary,
      diagnostics,
      summaryPath
    })
  } catch (error) {
    console.error('[CONTRACT_PARSING_ERROR]', error)
    return httpResponse(500, { error: error instanceof Error ? error.message : String(error) })
  }
})

// -----------------------------------------------------------------------------
// Core helpers
// -----------------------------------------------------------------------------

function createFieldState(): FieldState {
  const defaults: FieldState = {
    values: {
      title: null,
      property_address: null,
      client_name: null,
      buyer_name: null,
      buyer_email: null,
      seller_name: null,
      seller_email: null,
      purchase_price: null,
      earnest_money: null,
      contract_date: null,
      closing_date: null,
      inspection_date: null,
      inspection_response_date: null,
      loan_contingency_date: null,
      appraisal_date: null,
      final_walkthrough_date: null,
      summary: null
    },
    meta: {} as Record<FieldKey, FieldMetaInternal>
  }

  for (const key of Object.keys(defaults.values) as FieldKey[]) {
    defaults.meta[key] = {
      source: 'ai',
      confidence: 0,
      needsVerification: true,
      reason: 'Missing'
    }
  }

  return defaults
}

function populateFromSource(
  state: FieldState,
  raw: Record<string, unknown>,
  source: FieldSource,
  confidence: number
) {
  for (const key of Object.keys(state.values) as FieldKey[]) {
    const value = normalizeValue(raw, key)
    if (!value) continue
    if (state.values[key]) continue

    state.values[key] = value
    state.meta[key] = {
      source,
      confidence,
      needsVerification: confidence < VERIFICATION_THRESHOLD,
      reason: source === 'regex' ? 'Detected via contract clause' : undefined
    }
  }
}

function finalizeFieldState(state: FieldState) {
  const entries = Object.entries(state.meta) as [FieldKey, FieldMetaInternal][]
  const sorted = entries
    .filter(([, meta]) => meta.confidence < VERIFICATION_THRESHOLD || meta.forceReview)
    .sort((a, b) => a[1].confidence - b[1].confidence)

  const needsVerification: FieldKey[] = []
  sorted.forEach(([key, meta], index) => {
    const shouldFlag = index < MAX_WARNINGS
    state.meta[key].needsVerification = shouldFlag
    if (shouldFlag) {
      needsVerification.push(key)
    }
  })

  for (const key of Object.keys(state.meta) as FieldKey[]) {
    if (!needsVerification.includes(key)) {
      state.meta[key].needsVerification = false
    }
  }

  const publicMeta: Record<FieldKey, FieldMetaPublic> = {} as Record<FieldKey, FieldMetaPublic>
  for (const key of Object.keys(state.meta) as FieldKey[]) {
    const { forceReview, ...rest } = state.meta[key]
    publicMeta[key] = rest
  }

  return {
    values: state.values,
    meta: publicMeta,
    needsVerification
  }
}

function applyDeadlineRules(state: FieldState) {
  let applied = false
  const contractDate = parseDate(state.values.contract_date)

  const ensureDate = (
    key: FieldKey,
    calculator: () => Date | null,
    reason: string
  ) => {
    if (state.values[key]) return
    const computed = calculator()
    if (!computed) return
    state.values[key] = formatDate(computed)
    state.meta[key] = {
      source: 'rule',
      confidence: 0.68,
      needsVerification: true,
      reason
    }
    state.meta[key].forceReview = true
    applied = true
  }

  ensureDate('closing_date', () => {
    if (state.values.closing_date) return null
    if (contractDate) {
      return addDays(contractDate, 45)
    }
    return null
  }, 'Estimated closing date based on contract +45 days')

  ensureDate('inspection_date', () => {
    if (contractDate) {
      return addDays(contractDate, 7)
    }
    return null
  }, 'Default inspection deadline (contract +7 days)')

  ensureDate('inspection_response_date', () => {
    const insp = parseDate(state.values.inspection_date)
    if (insp) {
      return addDays(insp, 2)
    }
    return null
  }, 'Response due 2 days after inspection')

  ensureDate('loan_contingency_date', () => {
    const closing = parseDate(state.values.closing_date)
    if (closing) {
      return addDays(closing, -10)
    }
    return null
  }, 'Financing contingency defaults to 10 days before closing')

  ensureDate('final_walkthrough_date', () => {
    const closing = parseDate(state.values.closing_date)
    if (closing) {
      return addDays(closing, -2)
    }
    return null
  }, 'Final walkthrough 2 days before closing')

  return applied
}

// -----------------------------------------------------------------------------
// Normalization helpers
// -----------------------------------------------------------------------------

const FIELD_SYNONYMS: Record<FieldKey, string[]> = {
  title: ['title', 'document_title'],
  property_address: ['property_address', 'address', 'propertyAddress'],
  client_name: ['client_name', 'client'],
  buyer_name: ['buyer_name', 'purchaser_name'],
  buyer_email: ['buyer_email'],
  seller_name: ['seller_name', 'owner_name'],
  seller_email: ['seller_email'],
  purchase_price: ['purchase_price', 'price'],
  earnest_money: ['earnest_money', 'earnest_deposit'],
  contract_date: ['contract_date', 'effective_date'],
  closing_date: ['closing_date', 'close_date', 'settlement_date'],
  inspection_date: ['inspection_date', 'inspection_deadline'],
  inspection_response_date: ['inspection_response_date', 'inspection_response'],
  loan_contingency_date: ['loan_contingency_date', 'financing_contingency_date'],
  appraisal_date: ['appraisal_date', 'appraisal_deadline'],
  final_walkthrough_date: ['final_walkthrough_date', 'walkthrough_date'],
  summary: ['executive_summary', 'summary']
}

function normalizeValue(raw: Record<string, unknown>, key: FieldKey) {
  const synonyms = FIELD_SYNONYMS[key] ?? [key]
  for (const field of synonyms) {
    const value = raw[field]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
    if (typeof value === 'number') {
      return String(value)
    }
  }
  return null
}

function normalizeRiskItems(raw: Record<string, unknown>): RiskItem[] {
  const pool = Array.isArray(raw['risk_items'])
    ? (raw['risk_items'] as RiskItem[])
    : Array.isArray(raw['risks'])
    ? (raw['risks'] as RiskItem[])
    : []

  return pool
    .filter((item) => typeof item?.description === 'string')
    .map((item) => ({
      severity: item?.severity ?? 'info',
      description: item.description
    }))
}

// -----------------------------------------------------------------------------
// Regex fallback
// -----------------------------------------------------------------------------

function regexExtractFields(text: string): Partial<Record<FieldKey, string | null>> {
  const normalized = text.replace(/\r/g, '')

  const findLine = (labels: string[]) => {
    for (const label of labels) {
      const regex = new RegExp(`${label}\s*[:\-]?\s*([^\n]+)`, 'i')
      const match = normalized.match(regex)
      if (match?.[1]) return match[1].trim()
    }
    return null
  }

  const findCurrency = (labels: string[]) => {
    const line = findLine(labels)
    if (!line) return null
    const match = line.match(/([$€£]?\s*[0-9,.]+)/)
    return match ? cleanCurrency(match[1]) : null
  }

  const findDate = (labels: string[]) => {
    const line = findLine(labels)
    return line ? normalizeDateString(line) : null
  }

  const emails = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)

  return {
    title: findLine(['Property', 'Transaction']),
    property_address: extractAddress(normalized),
    client_name: findLine(['Client']),
    buyer_name: findLine(['Buyer', 'Purchaser']),
    buyer_email: emails?.[0] ?? null,
    seller_name: findLine(['Seller', 'Owner']),
    seller_email: emails?.[1] ?? null,
    purchase_price: findCurrency(['Purchase Price', 'Total Consideration']),
    earnest_money: findCurrency(['Earnest Money', 'Deposit Amount']),
    contract_date: findDate(['Contract Date', 'Effective Date']),
    closing_date: findDate(['Closing Date', 'Close of Escrow']),
    inspection_date: findDate(['Inspection Date', 'Inspection Deadline']),
    inspection_response_date: findDate(['Inspection Response', 'Repair Reply']),
    loan_contingency_date: findDate(['Financing Contingency', 'Loan Approval Deadline']),
    appraisal_date: findDate(['Appraisal Date', 'Appraisal Contingency']),
    final_walkthrough_date: findDate(['Final Walkthrough', 'Walkthrough Date']),
    summary: buildSummary(normalized)
  }
}

function extractAddress(text: string) {
  const regex = /(\d{1,5}\s+[A-Za-z0-9'.\-\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

function cleanCurrency(value: string) {
  return value.replace(/[^0-9.]/g, '')
}

function normalizeDateString(value: string) {
  const trimmed = value.trim()
  const iso = Date.parse(trimmed)
  if (!Number.isNaN(iso)) {
    return formatDate(new Date(iso))
  }

  const slashMatch = trimmed.match(/(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})/)
  if (slashMatch) {
    const [_, mm, dd, yyyy] = slashMatch
    const normalizedYear = yyyy.length === 2 ? `20${yyyy}` : yyyy
    return `${normalizedYear.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  return null
}

function buildSummary(text: string) {
  return text.slice(0, 400).replace(/\s+/g, ' ').trim() || null
}

// -----------------------------------------------------------------------------
// File helpers
// -----------------------------------------------------------------------------

async function downloadFromStorage(storagePath: string) {
  const { data, error } = await supabase.storage.from(CONTRACTS_BUCKET).download(storagePath)
  if (error || !data) {
    throw new Error(`Unable to download file: ${error?.message ?? 'unknown error'}`)
  }

  const buffer = await data.arrayBuffer()
  const fileBytes = new Uint8Array(buffer)
  const mimeType = data.type && data.type !== '' ? data.type : 'application/pdf'
  return { fileBytes, mimeType }
}

async function extractPlainText(fileBytes: Uint8Array, mimeType: string) {
  if (mimeType.startsWith('text/') || mimeType === 'message/rfc822') {
    return new TextDecoder().decode(fileBytes)
  }

  if (mimeType === 'application/pdf' && PDF_TO_TEXT_URL) {
    const res = await fetch(PDF_TO_TEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        ...(PDF_TO_TEXT_API_KEY ? { 'x-api-key': PDF_TO_TEXT_API_KEY } : {})
      },
      body: fileBytes
    })

    if (res.ok) {
      const json = await res.json()
      if (typeof json.text === 'string') {
        return json.text
      }
    } else {
      console.warn('[PDF_TO_TEXT_FAILED]', await res.text())
    }
  }

  return null
}

async function parseWithPrimary(fileBytes: Uint8Array, mimeType: string) {
  if (!PRIMARY_PARSER_URL) {
    throw new Error('PRIMARY_PARSER_URL env var is not configured')
  }

  const payload = { document_base64: encodeBase64(fileBytes), mime_type: mimeType }
  const res = await fetch(PRIMARY_PARSER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PRIMARY_PARSER_API_KEY ? { Authorization: `Bearer ${PRIMARY_PARSER_API_KEY}` } : {})
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    throw new Error(`Primary parser failed (${res.status})`)
  }

  return await res.json()
}

async function parseWithVisionFallback(fileBytes: Uint8Array) {
  if (!VISION_FALLBACK_URL) {
    return null
  }

  console.warn('[VISION_FALLBACK_TRIGGERED]', { at: new Date().toISOString() })

  const images = await ensureImages(fileBytes)
  const res = await fetch(VISION_FALLBACK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(VISION_PARSER_API_KEY ? { Authorization: `Bearer ${VISION_PARSER_API_KEY}` } : {})
    },
    body: JSON.stringify({ images })
  })

  if (!res.ok) {
    console.error('[VISION_FALLBACK_FAILED]', await res.text())
    return null
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
    console.warn('[PDF_TO_IMAGE_FAILED]', await res.text())
    return [`data:application/pdf;base64,${encodeBase64(fileBytes)}`]
  }

  const json = await res.json()
  if (!Array.isArray(json.images) || json.images.length === 0) {
    return [`data:application/pdf;base64,${encodeBase64(fileBytes)}`]
  }

  return json.images
}

// -----------------------------------------------------------------------------
// Persistence
// -----------------------------------------------------------------------------

async function persistSummary(
  contractId: string,
  values: Record<FieldKey, string | null>,
  riskItems: RiskItem[],
  diagnostics: ParserDiagnostics
) {
  const summaryPayload = {
    generated_at: new Date().toISOString(),
    parsed_contract: values,
    risk_items: riskItems,
    diagnostics
  }

  const summaryKey = `${SUMMARY_FOLDER}/${contractId}/summary.json`
  const { error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(summaryKey, new Blob([JSON.stringify(summaryPayload)], { type: 'application/json' }), {
      upsert: true,
      cacheControl: '3600'
    })

  if (error) {
    console.error('[SUMMARY_UPLOAD_FAILED]', error)
    return null
  }

  return summaryKey
}

async function updateContractRecord(
  contractId: string,
  userId: string,
  values: Record<FieldKey, string | null>,
  summaryPath: string | null
) {
  const { error } = await supabase
    .from('contracts')
    .update({
      title: values.title,
      property_address: values.property_address,
      client_name: values.client_name,
      buyer_name: values.buyer_name,
      buyer_email: values.buyer_email,
      seller_name: values.seller_name,
      seller_email: values.seller_email,
      purchase_price: values.purchase_price ? Number(values.purchase_price) : null,
      earnest_money: values.earnest_money ? Number(values.earnest_money) : null,
      contract_date: values.contract_date,
      closing_date: values.closing_date,
      inspection_date: values.inspection_date,
      inspection_response_date: values.inspection_response_date,
      loan_contingency_date: values.loan_contingency_date,
      appraisal_date: values.appraisal_date,
      final_walkthrough_date: values.final_walkthrough_date,
      ai_summary: values.summary,
      summary_path: summaryPath,
      updated_at: new Date().toISOString()
    })
    .eq('id', contractId)
    .eq('user_id', userId)

  if (error) {
    console.error('[CONTRACT_UPDATE_FAILED]', error)
  }
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function parseDate(value: string | null) {
  if (!value) return null
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? null : new Date(ts)
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function httpResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
