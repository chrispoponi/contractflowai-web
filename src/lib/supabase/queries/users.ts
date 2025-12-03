import { supabase } from '../client'
import type { Tables, TablesUpdate } from '../types'

export async function fetchCurrentUser(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  if (error) {
    console.error(error)
    throw error
  }
  return data as Tables<'users'>
}

export async function updateUser(userId: string, updates: TablesUpdate<'users'>) {
  const { error } = await supabase.from('users').update(updates).eq('id', userId)
  if (error) {
    console.error(error)
    throw error
  }
}
