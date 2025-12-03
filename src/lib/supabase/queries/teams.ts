import { supabase } from '../client'
import type { Tables, TablesInsert } from '../types'

export async function listTeams(ownerId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(*)')
    .eq('owner_id', ownerId)

  if (error) {
    console.error(error)
    throw error
  }

  return data as (Tables<'teams'> & { team_members: Tables<'team_members'>[] })[]
}

export async function createTeam(payload: TablesInsert<'teams'>) {
  const { error } = await supabase.from('teams').insert(payload)
  if (error) {
    console.error(error)
    throw error
  }
}
