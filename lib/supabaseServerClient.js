import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtccctajvobfvhlonaot.supabase.co'
const supabaseServiceRoleKey = '***REMOVED***' // Only on server

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase service role key.');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);
