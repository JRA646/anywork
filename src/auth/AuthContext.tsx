import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { AnyWorkProfile, AnyWorkRole } from '../types/auth'

type SignUpInput = {
  email: string
  password: string
  role: Exclude<AnyWorkRole, 'admin'>
  firstName: string
  lastName: string
  companyName?: string
  phone?: string
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: AnyWorkProfile | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string, expectedRole?: AnyWorkRole) => Promise<AnyWorkProfile>
  signUp: (input: SignUpInput) => Promise<{ profile: AnyWorkProfile | null; needsEmailConfirmation: boolean }>
  updateProfile: (changes: Partial<Omit<AnyWorkProfile, 'user_id' | 'role' | 'created_at' | 'updated_at'>>) => Promise<AnyWorkProfile>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('anywork_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data as AnyWorkProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AnyWorkProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await fetchProfile(userId)
    setProfile(nextProfile)
    return nextProfile
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        if (mounted) setLoading(false)
        return
      }

      if (!mounted) return

      setSession(data.session)
      if (data.session?.user) {
        try {
          await loadProfile(data.session.user.id)
        } catch {
          if (mounted) setProfile(null)
        }
      }
      setLoading(false)
    }

    void bootstrap()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (!nextSession?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      window.setTimeout(() => {
        void loadProfile(nextSession.user.id)
          .catch(() => setProfile(null))
          .finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string, expectedRole?: AnyWorkRole) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Sign in did not return a user.')

    const nextProfile = await loadProfile(data.user.id)

    if (!nextProfile.is_active) {
      await supabase.auth.signOut()
      throw new Error('This account is currently inactive.')
    }

    if (expectedRole && nextProfile.role !== expectedRole) {
      await supabase.auth.signOut()
      throw new Error(
        expectedRole === 'admin'
          ? 'This account is not authorized for the operations workspace.'
          : `This account is registered as a ${nextProfile.role}. Use the matching workspace sign in.`,
      )
    }

    setSession(data.session)
    return nextProfile
  }, [loadProfile])

  const signUp = useCallback(async (input: SignUpInput) => {
    if (!supabase) throw new Error('Supabase is not configured.')

    const displayName = [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(' ')

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          anywork_role: input.role,
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          display_name: displayName,
          company_name: input.companyName?.trim() || null,
          phone: input.phone?.trim() || null,
        },
      },
    })

    if (error) throw error

    if (!data.user) throw new Error('Account creation did not return a user.')

    if (!data.session) {
      return { profile: null, needsEmailConfirmation: true }
    }

    const nextProfile = await loadProfile(data.user.id)
    setSession(data.session)
    return { profile: nextProfile, needsEmailConfirmation: false }
  }, [loadProfile])

  const updateProfile = useCallback(async (changes: Partial<Omit<AnyWorkProfile, 'user_id' | 'role' | 'created_at' | 'updated_at'>>) => {
    if (!supabase || !session?.user) throw new Error('You must be signed in to update your profile.')

    const { data, error } = await supabase
      .from('anywork_profiles')
      .update(changes)
      .eq('user_id', session.user.id)
      .select('*')
      .single()

    if (error) throw error

    const nextProfile = data as AnyWorkProfile
    setProfile(nextProfile)
    return nextProfile
  }, [session?.user])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    configured: isSupabaseConfigured,
    signIn,
    signUp,
    updateProfile,
    signOut,
  }), [session, profile, loading, signIn, signUp, updateProfile, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
