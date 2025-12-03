import { supabase } from './client'

export const uploadToBucket = async (bucket: string, path: string, file: Blob) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  return data
}

export const getSignedUrl = async (bucket: string, path: string, expiresIn = 60 * 60) => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
