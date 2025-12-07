import { supabase } from '../client'

type ReferralRow = {
  id: string
  property_address: string | null
  referral_source?: string | null
  agent_notes?: string | null
  created_at: string | null
}

const REFERRAL_COLUMNS = 'id, property_address, referral_source, created_at'

export const ReferralsAPI = {
  list: (userId: string) => supabase.from('contracts').select(REFERRAL_COLUMNS).eq('user_id', userId),
  attach: (contractId: string, payload: Record<string, unknown>) => supabase.from('contracts').update(payload).eq('id', contractId)
}

export const listReferrals = async (userId: string) => {
  const { data, error } = await ReferralsAPI.list(userId)

  if (error) {
    console.warn('[listReferrals:fallback]', error.message)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('contracts')
      .select('id, property_address, agent_notes, created_at')
      .eq('user_id', userId)

    if (fallbackError) {
      throw fallbackError
    }

    return (fallbackData ?? []).map((row) => ({
      id: row.id,
      property_address: row.property_address ?? 'Contract',
      referral_source: row.agent_notes,
      created_at: row.created_at
    }))
  }

  const rows = Array.isArray(data) ? data : []
  return rows.filter((row) => row.referral_source ?? row.agent_notes)
}

export const attachReferral = async (contractId: string, payload: Record<string, unknown>) => {
  const { error } = await ReferralsAPI.attach(contractId, payload)
  if (!error) return

  console.warn('[attachReferral:fallback]', error.message)
  const referralSourceRaw = (payload as { referral_source?: unknown }).referral_source
  const referralSource = typeof referralSourceRaw === 'string' ? referralSourceRaw : null
  const fallbackPayload = {
    agent_notes: referralSource ? `Referral: ${referralSource}` : referralSourceRaw ?? null
  }
  const { error: fallbackError } = await supabase.from('contracts').update(fallbackPayload).eq('id', contractId)
  if (fallbackError) {
    throw fallbackError
  }
}
