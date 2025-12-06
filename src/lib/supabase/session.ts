import { supabase } from './client'

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error fetching session', error)
    return null
  }
  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error fetching user', error)
    return null
  }
  return data.user
}
