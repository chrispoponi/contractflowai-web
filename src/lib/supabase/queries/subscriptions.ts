import { supabase } from '../client'

export const SubscriptionsAPI = {
  list: (userId: string) => supabase.from('user_subscriptions').select('*').eq('user_id', userId),
  update: (id: string, payload: Record<string, unknown>) => supabase.from('user_subscriptions').update(payload).eq('id', id)
}

export const listUserSubscriptions = (userId: string) => SubscriptionsAPI.list(userId)
export const updateSubscription = (id: string, payload: Record<string, unknown>) => SubscriptionsAPI.update(id, payload)
