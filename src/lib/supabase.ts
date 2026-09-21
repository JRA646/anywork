import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://papmvkkydeuzoslnymmg.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_X3yhSz2K5NAfJf_xBiEqFA_PTC36bjJ'

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.')
  }

  return supabase
}
