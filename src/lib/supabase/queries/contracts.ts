import { supabase } from '../client'
import type { Tables, TablesInsert, TablesUpdate } from '../types'

export async function listContracts(userId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    throw error
  }
  return data as Tables<'contracts'>[]
}

export async function fetchContract(contractId: string, userId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error(error)
    throw error
  }

  return data as Tables<'contracts'>
}

export async function insertContract(payload: TablesInsert<'contracts'>) {
  const { data, error } = await supabase.from('contracts').insert(payload).select().single()
  if (error) {
    console.error(error)
    throw error
  }
  return data as Tables<'contracts'>
}

export async function updateContract(contractId: string, updates: TablesUpdate<'contracts'>) {
  const { error } = await supabase.from('contracts').update(updates).eq('id', contractId)
  if (error) {
    console.error(error)
    throw error
  }
}

export async function listCounterOffers(contractId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('parent_contract_id', contractId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error(error)
    throw error
  }
  return data as Tables<'contracts'>[]
}
