import { supabase } from "./supabaseClient";

const PROFILE_TABLE =
  import.meta.env.VITE_SUPABASE_PROFILE_TABLE || "profiles";

const redirectBasePath =
  import.meta.env.VITE_SUPABASE_LOGIN_ROUTE || "/Login";

function normalizeRedirectPath(pathname) {
  if (!pathname) {
    return "/";
  }
  if (pathname.startsWith("http")) {
    return pathname;
  }
  if (pathname.startsWith("/")) {
    return pathname;
  }
  return `/${pathname}`;
}

async function ensureProfile(user) {
  const profileSeed = {
    id: user.id,
    email: user.email,
    full_name:
      user.user_metadata?.full_name ||
      user.email?.split("@")?.[0] ||
      "User",
  };

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(profileSeed, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const profile = data || (await ensureProfile(user));

  return {
    ...profile,
    id: user.id,
    email: user.email,
    full_name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      profile?.email ||
      user.email,
  };
}

export async function updateCurrentProfile(updates) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User must be signed in to update their profile.");
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    ...data,
    email: user.email,
  };
}

export async function isAuthenticated() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return Boolean(data.session);
}

export function redirectToLogin(redirectPath = window.location.pathname) {
  const normalized = normalizeRedirectPath(redirectPath);
  const params = new URLSearchParams();
  if (normalized) {
    params.set("redirect", normalized);
  }
  window.location.href = `${redirectBasePath}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
}

export async function logout(redirectPath = "/Landing") {
  await supabase.auth.signOut();
  const normalized = normalizeRedirectPath(redirectPath);
  window.location.href = normalized;
}

export async function signInWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
}

export async function signUpWithPassword({
  email,
  password,
  metadata = {},
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function sendMagicLink(email, redirectPath = "/Dashboard") {
  const normalized = new URL(
    normalizeRedirectPath(redirectPath),
    window.location.origin
  ).toString();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: normalized,
    },
  });

  if (error) {
    throw error;
  }
}
