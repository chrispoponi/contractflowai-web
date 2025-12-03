import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uehjpftyvycbrketwhwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaGpwZnR5dnljYnJrZXR3aHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExODksImV4cCI6MjA4MDI1NzE4OX0.mvgVPHF_07nSzk0DljZmhJfyGISAAtxM6RlDUK1sKnY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
