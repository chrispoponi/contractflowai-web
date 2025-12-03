import { supabase } from '../client'
import type { Database } from '../types'

type ContractRow = Database['public']['Tables']['contracts']['Row']

type ContractPayload = Database['public']['Tables']['contracts']['Insert']

type ContractUpdate = Database['public']['Tables']['contracts']['Update']

export const ContractsAPI = {
  listByUser: async (userId: string) => {
    const { data, error } = await supabase.from('contracts').select('*').eq('user_id', userId)
    if (error) throw error
    return data as ContractRow[]
  },

  getById: async (id: string, userId: string) => {
    const { data, error } = await supabase.from('contracts').select('*').eq('id', id).eq('user_id', userId).single()
    if (error) throw error
    return data as ContractRow
  },

  insert: async (payload: ContractPayload) => {
    const { data, error } = await supabase.from('contracts').insert(payload).select().single()
    if (error) throw error
    return data as ContractRow
  },

  update: async (id: string, userId: string, payload: ContractUpdate) => {
    const { data, error } = await supabase.from('contracts').update(payload).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return data as ContractRow
  },

  remove: async (id: string, userId: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  },

  listCounterOffers: async (contractId: string, userId: string) => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('original_contract_id', contractId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractRow[]
  }
}
