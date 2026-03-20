import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
/** Public anon JWT shape so `createClient` succeeds at build time when env is unset. */
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WoeweSSeAjZxn4pP914mZkAAdKwF5AuBxjy8';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || PLACEHOLDER_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() || PLACEHOLDER_KEY;

const usingPlaceholder =
  supabaseUrl === PLACEHOLDER_URL || supabaseKey === PLACEHOLDER_KEY;

if (typeof window !== 'undefined' && usingPlaceholder) {
  console.warn(
    'Supabase credentials not found. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.local.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
