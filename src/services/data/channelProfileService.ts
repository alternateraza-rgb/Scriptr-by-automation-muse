import { supabase } from '../../lib/supabase'
import type { ChannelProfileRow } from './types'

export type ChannelProfileInput = {
  user_id: string
  channel_name: string
  niche: string | null
  audience: string | null
  tone: string | null
  video_length: string | null
  monetization_goal: string | null
  content_pillars: string | null
  example_channels: string | null
  is_default?: boolean
}

export const channelProfileService = {
  async listByUserId(userId: string) {
    const { data, error } = await supabase
      .from('channel_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .returns<ChannelProfileRow[]>()

    if (error) {
      throw error
    }

    return data ?? []
  },

  async upsertDefault(input: ChannelProfileInput) {
    const payload = { ...input, is_default: true }
    const { data: existing, error: existingError } = await supabase
      .from('channel_profiles')
      .select('*')
      .eq('user_id', input.user_id)
      .eq('is_default', true)
      .maybeSingle<ChannelProfileRow>()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      const { data, error } = await supabase
        .from('channel_profiles')
        .update(payload)
        .eq('id', existing.id)
        .eq('user_id', input.user_id)
        .select('*')
        .single<ChannelProfileRow>()

      if (error) {
        throw error
      }
      return data
    }

    const { data, error } = await supabase
      .from('channel_profiles')
      .insert(payload)
      .select('*')
      .single<ChannelProfileRow>()

    if (error) {
      throw error
    }
    return data
  },

  async create(input: ChannelProfileInput) {
    const { data, error } = await supabase
      .from('channel_profiles')
      .insert(input)
      .select('*')
      .single<ChannelProfileRow>()

    if (error) {
      throw error
    }

    return data
  },

  async update(id: string, userId: string, updates: Partial<ChannelProfileInput>) {
    const { data, error } = await supabase
      .from('channel_profiles')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single<ChannelProfileRow>()

    if (error) {
      throw error
    }

    return data
  },

  async remove(id: string, userId: string) {
    const { error } = await supabase.from('channel_profiles').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      throw error
    }
  },
}
