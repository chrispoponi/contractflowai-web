import { supabase } from '../client'

export const TeamsAPI = {
  list: (ownerId: string) => supabase.from('teams').select('*').eq('owner_id', ownerId),
  create: (payload: Record<string, unknown>) => supabase.from('teams').insert(payload)
}

export const listTeams = (ownerId: string) => TeamsAPI.list(ownerId)
export const createTeam = (payload: Record<string, unknown>) => TeamsAPI.create(payload)
