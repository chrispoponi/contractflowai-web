import { supabase } from "./supabaseClient";

export async function invokeFunction(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data;
}
