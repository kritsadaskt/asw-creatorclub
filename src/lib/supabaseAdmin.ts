import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only client with service role key — bypasses RLS
// Never import this in client components
let _supabaseAdmin: SupabaseClient | null = null;

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      _supabaseAdmin = createClient(url, key);
    }
    return (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop];
  },
});
