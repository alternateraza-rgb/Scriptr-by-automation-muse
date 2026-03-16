import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { ProfileRow } from './types'

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<ProfileRow>()

    if (error) {
      throw error
    }

    return data
  },

  async ensureProfile(user: User, fullName?: string) {
    const payload = {
      user_id: user.id,
      email: user.email ?? '',
      full_name: fullName ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single<ProfileRow>()

    if (error) {
      throw error
    }

    return data
  },

  async ensureProfileByIdentity(userId: string, email: string, fullName?: string | null) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          email,
          full_name: fullName ?? null,
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single<ProfileRow>()

    if (error) {
      throw error
    }

    return data
  },

  async updateProfile(userId: string, updates: Partial<Pick<ProfileRow, 'full_name' | 'email'>>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select('*')
      .single<ProfileRow>()

    if (error) {
      throw error
    }

    return data
  },
}
