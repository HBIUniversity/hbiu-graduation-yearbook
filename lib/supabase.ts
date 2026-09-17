import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gdvxnvbxvwmthqazuhca.supabase.co';
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_L3ba1-fPyLagykI0FrAIqw_HfMlNi1h';

export function publicDb() {
  return createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminDb() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const YEARBOOK_STORAGE_PUBLIC = 'hbiu-yearbook-published';
export const YEARBOOK_STORAGE_PRIVATE = 'hbiu-yearbook-editor';
