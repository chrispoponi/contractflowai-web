import { supabase } from '../client'

export const ReferralsAPI = {
  list: (userId: string) =>
    supabase.from('contracts').select('id, title, referral_source, created_at').eq('user_id', userId).not('referral_source', 'is', null),
  attach: (contractId: string, payload: Record<string, unknown>) => supabase.from('contracts').update(payload).eq('id', contractId)
}

export const listReferrals = (userId: string) => ReferralsAPI.list(userId)
export const attachReferral = (contractId: string, payload: Record<string, unknown>) =>
  ReferralsAPI.attach(contractId, payload)
