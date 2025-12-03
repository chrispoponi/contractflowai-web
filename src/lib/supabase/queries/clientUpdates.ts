import { supabase } from '../client'
import type { Database } from '../types'

type ClientUpdateRow = Database['public']['Tables']['client_updates']['Row']

export const ClientUpdatesAPI = {
  listByUser: async (userId: string): Promise<ClientUpdateRow[]> => {
    const { data, error } = await supabase
      .from('client_updates')
      .select('*')
      .eq('user_id', userId)
      .order('sent_date', { ascending: false })
    if (error) throw error
    return data ?? []
  }
}
