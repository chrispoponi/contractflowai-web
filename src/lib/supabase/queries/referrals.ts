import { supabase } from '../client'
import type { Tables, TablesUpdate } from '../types'

export async function listReferrals(userId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, title, referral_source, created_at')
    .eq('user_id', userId)
    .not('referral_source', 'is', null)

  if (error) {
    console.error(error)
    throw error
  }

  return data as Pick<Tables<'contracts'>, 'id' | 'title' | 'referral_source' | 'created_at'>[]
}

export async function attachReferral(contractId: string, updates: TablesUpdate<'contracts'>) {
  const { error } = await supabase.from('contracts').update(updates).eq('id', contractId)
  if (error) {
    console.error(error)
    throw error
  }
}
