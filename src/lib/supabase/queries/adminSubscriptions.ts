import { supabase } from '../client'
import type { Database } from '../types'

type UserRow = Database['public']['Tables']['users']['Row']

export type AdminSubscriptionPayload = Partial<
  Pick<UserRow, 'subscription_tier' | 'subscription_status' | 'trial_end_date' | 'subscription_notes' | 'stripe_customer_id'>
>

type AdminSubscriptionsResponse =
  | { users: UserRow[] }
  | { user: UserRow }
  | { success: boolean; message?: string }

const invoke = async <T extends AdminSubscriptionsResponse>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('adminSubscriptions', { body })
  if (error) {
    throw new Error(error.message ?? 'Admin subscriptions function failed')
  }
  return data as T
}

export const AdminSubscriptionsAPI = {
  list: async (): Promise<UserRow[]> => {
    const payload = await invoke<{ users: UserRow[] }>({ action: 'list' })
    return payload.users
  },
  updateUser: async (userId: string, updates: AdminSubscriptionPayload): Promise<UserRow> => {
    const payload = await invoke<{ user: UserRow }>({ action: 'update', targetUserId: userId, updates })
    return payload.user
  },
  quickUpgrade: async (): Promise<UserRow> => {
    const payload = await invoke<{ user: UserRow }>({ action: 'quick-upgrade' })
    return payload.user
  }
}
