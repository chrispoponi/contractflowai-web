import { supabase } from '../client'

export const TeamMembersAPI = {
  listByTeam: async (teamId: string) => supabase.from('team_members').select('*').eq('team_id', teamId),
  add: async (payload: Record<string, unknown>) => supabase.from('team_members').insert(payload)
}
