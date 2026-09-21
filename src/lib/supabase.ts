import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The public client is deliberately optional during local design work. The
 * production build receives these public values from GitHub Actions variables.
 * All access to Secret Pioneers data remains controlled by Postgres RLS.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null

export const isSupabaseConfigured = supabase !== null
