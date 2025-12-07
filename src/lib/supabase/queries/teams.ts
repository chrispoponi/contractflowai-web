import { supabase } from '../client'

export const TeamsAPI = {
  list: (ownerId: string) =>
    supabase.from('teams').select('id, name, owner_id, created_at, team_members(*)').eq('owner_id', ownerId),
  create: (payload: Record<string, unknown>) => supabase.from('teams').insert(payload)
}

export const listTeams = async (ownerId: string) => {
  const { data, error } = await TeamsAPI.list(ownerId)
  if (error) {
    throw error
  }
  return Array.isArray(data) ? data : []
}

export const createTeam = (payload: Record<string, unknown>) => TeamsAPI.create(payload)
