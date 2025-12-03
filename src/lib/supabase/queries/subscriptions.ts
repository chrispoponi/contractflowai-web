import { supabase } from '../client'
import type { Tables, TablesUpdate } from '../types'

export async function listUserSubscriptions(userId: string) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    throw error
  }

  return data as Tables<'user_subscriptions'>[]
}

export async function updateSubscription(subscriptionId: string, updates: TablesUpdate<'user_subscriptions'>) {
  const { error } = await supabase.from('user_subscriptions').update(updates).eq('id', subscriptionId)
  if (error) {
    console.error(error)
    throw error
  }
}
