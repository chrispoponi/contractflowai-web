import { supabase } from '../client'
import type { Database } from '../types'

type ContractRow = Database['public']['Tables']['contracts']['Row']

type ContractPayload = Database['public']['Tables']['contracts']['Insert']

type ContractUpdate = Database['public']['Tables']['contracts']['Update']

// Absolute bare minimum columns (guaranteed to exist)
const BARE_MINIMUM = `
  id,
  user_id,
  created_at
`

// Minimal columns that MUST exist in any contracts table
const MINIMAL_COLUMNS = `
  id,
  user_id,
  title,
  property_address,
  buyer_name,
  seller_name,
  purchase_price,
  earnest_money,
  contract_date,
  inspection_date,
  closing_date,
  status,
  contract_file_url,
  created_at,
  updated_at
`

// Core columns that should exist after basic setup
const CORE_COLUMNS = `
  id,
  user_id,
  title,
  property_address,
  buyer_name,
  seller_name,
  purchase_price,
  earnest_money,
  contract_date,
  inspection_date,
  inspection_response_date,
  appraisal_date,
  loan_contingency_date,
  final_walkthrough_date,
  closing_date,
  status,
  is_counter_offer,
  counter_offer_number,
  original_contract_id,
  contract_file_url,
  plain_language_summary,
  ai_summary,
  created_at,
  updated_at
`

// Full columns including optional fields (use only if columns exist in your DB)
const EXTENDED_COLUMNS = `
  buyer_email,
  seller_email,
  representing_side,
  inspection_completed,
  inspection_response_completed,
  appraisal_completed,
  loan_contingency_completed,
  final_walkthrough_completed,
  closing_completed,
  all_parties_signed,
  signature_date,
  cancellation_reason,
  cancellation_notes,
  cancellation_date,
  counter_offer_path,
  summary_path,
  referral_source,
  agent_notes,
  client_name
`

// Use minimal columns by default (safest for querying)
// Switch to CORE_COLUMNS or add EXTENDED_COLUMNS once you've added them to your DB
const CONTRACT_COLUMNS = MINIMAL_COLUMNS

export const ContractsAPI = {
  listByUser: async (userId: string) => {
    const { data, error } = await supabase.from('contracts').select(CONTRACT_COLUMNS).eq('user_id', userId)
    if (error) throw error
    return data as ContractRow[]
  },

  getById: async (id: string, userId: string) => {
    const { data, error } = await supabase.from('contracts').select(CONTRACT_COLUMNS).eq('id', id).eq('user_id', userId).single()
    if (error) throw error
    return data as ContractRow
  },

  insert: async (payload: ContractPayload) => {
    const { data, error } = await supabase.from('contracts').insert(payload).select(CONTRACT_COLUMNS).single()
    if (error) throw error
    return data as ContractRow
  },

  update: async (id: string, userId: string, payload: ContractUpdate) => {
    const { data, error } = await supabase
      .from('contracts')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select(CONTRACT_COLUMNS)
      .single()
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
      .select(CONTRACT_COLUMNS)
      .eq('original_contract_id', contractId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractRow[]
  }
}

export const listContracts = (userId: string) => ContractsAPI.listByUser(userId)
export const getContract = (id: string, userId: string) => ContractsAPI.getById(id, userId)
export const fetchContract = (id: string, userId: string) => ContractsAPI.getById(id, userId)
export const insertContract = (payload: ContractPayload) => ContractsAPI.insert(payload)
export const updateContract = (id: string, userId: string, payload: ContractUpdate) => ContractsAPI.update(id, userId, payload)
export const deleteContract = (id: string, userId: string) => ContractsAPI.remove(id, userId)
export const listContractCounterOffers = (contractId: string, userId: string) =>
  ContractsAPI.listCounterOffers(contractId, userId)
export const listCounterOffers = (contractId: string, userId: string) =>
  ContractsAPI.listCounterOffers(contractId, userId)
