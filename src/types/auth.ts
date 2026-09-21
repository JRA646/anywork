import type { Session, User } from '@supabase/supabase-js'

export type AnyWorkRole = 'customer' | 'provider' | 'admin'

export type AnyWorkProfile = {
  user_id: string
  role: AnyWorkRole
  first_name: string
  last_name: string
  display_name: string
  company_name: string | null
  phone: string | null
  avatar_url: string | null
  bio: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  onboarding_completed: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AuthUser = User
export type AuthSession = Session
