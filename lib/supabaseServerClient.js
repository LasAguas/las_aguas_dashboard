import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtccctajvobfvhlonaot.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0Y2NjdGFqdm9iZnZobG9uYW90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk5Mjc3MCwiZXhwIjoyMDcwNTY4NzcwfQ.Ztx1bFawe5CvBeHOlDaE03N3MsOQF5SALFgG3tHu4s0' // Only on server

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase service role key.');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);
