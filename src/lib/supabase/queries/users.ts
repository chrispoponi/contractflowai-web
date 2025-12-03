import { supabase } from '../client'
import type { Database } from '../types'

type UserRow = Database['public']['Tables']['users']['Row']

export const UsersAPI = {
  getCurrent: async (uid: string): Promise<UserRow> => {
    const { data, error } = await supabase.from('users').select('*').eq('id', uid).single()
    if (error) throw error
    return data
  },
  update: async (uid: string, payload: Partial<UserRow>): Promise<UserRow> => {
    const { data, error } = await supabase.from('users').update(payload).eq('id', uid).select().single()
    if (error) throw error
    return data
  }
}
