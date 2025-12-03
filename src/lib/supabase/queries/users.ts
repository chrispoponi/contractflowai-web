import { supabase } from '../client'

export const UsersAPI = {
  getCurrent: async (uid: string) => supabase.from('users').select('*').eq('id', uid).single(),
  update: async (uid: string, payload: Record<string, unknown>) => supabase.from('users').update(payload).eq('id', uid)
}
