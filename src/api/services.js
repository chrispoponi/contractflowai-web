import { supabase } from './supabaseClient';

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'contracts';
const DEFAULT_AUTH_PROVIDER = import.meta.env.VITE_SUPABASE_AUTH_PROVIDER || 'google';

const PROFILE_FIELDS = `
  id,
  email,
  full_name,
  role,
  subscription_tier,
  subscription_status,
  organization_role,
  organization_id,
  trial_start_date,
  trial_end_date,
  monthly_reset_date,
  contracts_used_this_month,
  email_notifications_enabled,
  reminder_inspection_days,
  reminder_closing_days,
  brokerage_name
`;

const resolveOrderClause = (orderClause = '-created_at') => {
  if (!orderClause) {
    return { column: 'created_at', ascending: false };
  }
  const ascending = !orderClause.startsWith('-');
  const column = orderClause.replace(/^-/, '') || 'created_at';
  return { column, ascending };
};

const ensureAuthUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const getCurrentProfile = async () => {
  const authUser = await ensureAuthUser();
  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', authUser.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const defaultProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Agent',
        role: 'user',
        subscription_tier: 'trial',
        subscription_status: 'active',
        contracts_used_this_month: 0,
        monthly_reset_date: new Date().toISOString().split('T')[0],
      };

      const { error: insertError } = await supabase.from('profiles').insert(defaultProfile);
      if (insertError) throw insertError;
      return defaultProfile;
    }
    throw error;
  }

  return {
    ...data,
    email: data.email || authUser.email,
    auth_user_id: authUser.id,
  };
};

export const updateProfile = async (updates) => {
  const authUser = await ensureAuthUser();
  if (!authUser) {
    throw new Error('User is not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', authUser.id)
    .select(PROFILE_FIELDS)
    .single();

  if (error) throw error;

  return {
    ...data,
    email: data.email || authUser.email,
    auth_user_id: authUser.id,
  };
};

export const isAuthenticated = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return Boolean(data.session);
};

const buildRedirectUrl = (pathname = '/') => {
  if (pathname.startsWith('http')) {
    return pathname;
  }
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${window.location.origin}${normalizedPath}`;
};

export const redirectToLogin = async (pathname = window.location.pathname) => {
  const redirectTo = buildRedirectUrl(pathname || '/');
  if (DEFAULT_AUTH_PROVIDER === 'magic_link') {
    window.location.href = '/login';
    return;
  }

  await supabase.auth.signInWithOAuth({
    provider: DEFAULT_AUTH_PROVIDER,
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

export const signOutUser = async (redirectPath = '/') => {
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    window.location.href = redirectPath;
  }
};

export const fetchContracts = async (orderClause = '-created_at') => {
  const { column, ascending } = resolveOrderClause(orderClause);
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order(column, { ascending });

  if (error) throw error;
  return data || [];
};

export const createContract = async (contractData) => {
  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...contractData })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateContract = async (contractId, updates) => {
  if (!contractId) throw new Error('Contract ID is required');
  const { data, error } = await supabase
    .from('contracts')
    .update({ ...updates })
    .eq('id', contractId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchReferralsByEmail = async (email) => {
  if (!email) return [];
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createReferral = async (entry) => {
  const { data, error } = await supabase
    .from('referrals')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchClientUpdates = async (orderClause = '-sent_date') => {
  const { column, ascending } = resolveOrderClause(orderClause);
  const { data, error } = await supabase
    .from('client_updates')
    .select('*')
    .order(column, { ascending });

  if (error) throw error;
  return data || [];
};

export const createClientUpdate = async (entry) => {
  const { data, error } = await supabase
    .from('client_updates')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchOrganizations = async () => {
  const { data, error } = await supabase.from('organizations').select('*');
  if (error) throw error;
  return data || [];
};

export const fetchUsers = async () => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data || [];
};

export const updateUserById = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteUserById = async (userId) => {
  if (!userId) throw new Error('User ID is required');
  return invokeSupabaseFunction('deleteUserAccount', { userId });
};

const buildFilePath = (prefix, filename = 'upload') => {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const unique = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}/${Date.now()}-${unique}-${safeName}`;
};

export const uploadContractFile = async (file, prefix = 'contracts') => {
  if (!file) throw new Error('No file provided for upload');
  const path = buildFilePath(prefix, file.name || 'contract.pdf');
  const bucket = STORAGE_BUCKET;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
};

export const invokeSupabaseFunction = async (name, payload = {}, options = {}) => {
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
    headers: options.headers,
  });

  if (error) {
    throw new Error(error.message || `Supabase function ${name} failed`);
  }

  return data;
};

export const generateClientTimeline = async (payload) =>
  invokeSupabaseFunction('generateClientTimeline', payload);

export const processReferral = async (payload) =>
  invokeSupabaseFunction('processReferral', payload);

export const sendDailyReminders = async () =>
  invokeSupabaseFunction('sendDailyReminders');

export const extractContractData = async (payload) =>
  invokeSupabaseFunction('extractContractData', payload);

export const verifyContractData = async (payload) =>
  invokeSupabaseFunction('verifyContractData', payload);

export const summarizeContract = async (payload) =>
  invokeSupabaseFunction('summarizeContract', payload);

export const sendClientEmail = async (payload) =>
  invokeSupabaseFunction('sendClientEmail', payload);
