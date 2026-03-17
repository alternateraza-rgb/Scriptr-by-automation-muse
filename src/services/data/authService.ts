import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

const getAuthRedirectUrl = () => {
  if (typeof window === 'undefined') {
    return undefined
  }
  return `${window.location.origin}/`
}

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: { full_name: fullName },
      },
    })

    if (error) {
      throw error
    }

    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
    return data
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    })
    if (error) {
      throw error
    }
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  },

  async sendPasswordResetEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl(),
    })

    if (error) {
      throw error
    }
  },

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) {
      throw error
    }
    return data
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      throw error
    }
    return data.session
  },

  async getUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      throw error
    }
    return data.user
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
