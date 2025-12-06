import { supabase } from '../client'

export const OrganizationsAPI = {
  list: async (ownerId: string) => supabase.from('organizations').select('*').eq('owner_id', ownerId),
  create: async (payload: Record<string, unknown>) => supabase.from('organizations').insert(payload)
}
