import { supabase } from '../client'

export const ContractsAPI = {
  list: (uid: string) => supabase.from('contracts').select('*').eq('user_id', uid),
  get: (id: string, uid: string) => supabase.from('contracts').select('*').eq('id', id).eq('user_id', uid).single(),
  update: (id: string, uid: string, payload: Record<string, unknown>) =>
    supabase.from('contracts').update(payload).eq('id', id).eq('user_id', uid),
  listCounterOffers: (contractId: string) =>
    supabase.from('contracts').select('*').eq('parent_contract_id', contractId).order('created_at', { ascending: false })
}

export const listContracts = (uid: string) => ContractsAPI.list(uid)
export const fetchContract = (id: string, uid: string) => ContractsAPI.get(id, uid)
export const updateContract = (id: string, uid: string, payload: Record<string, unknown>) =>
  ContractsAPI.update(id, uid, payload)
export const listCounterOffers = (contractId: string) => ContractsAPI.listCounterOffers(contractId)
