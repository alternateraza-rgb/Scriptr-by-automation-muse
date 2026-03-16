import { supabase } from '../../lib/supabase'
import type { ChannelProfileRow } from './types'

export type ChannelProfileInput = {
  user_id: string
  channel_name: string
  niche: string | null
  audience: string | null
  tone: string | null
  video_length: string | null
  video_format: string | null
  topic_focus: string | null
  target_audience: string | null
  channel_stage: string | null
  audience_knowledge_level: string | null
  audience_pain_points: string | null
  user_notes: string | null
  monetization_goal: string | null
  content_pillars: string | null
  example_channels: string | null
  is_default?: boolean
}

const CONTEXT_FIELDS: Array<keyof ChannelProfileInput> = [
  'video_format',
  'topic_focus',
  'target_audience',
  'channel_stage',
  'audience_knowledge_level',
  'audience_pain_points',
  'user_notes',
]

const isUndefinedColumnError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === '42703'

const stripContextFields = <T extends Partial<ChannelProfileInput>>(payload: T): T => {
  const next = { ...payload }
  for (const field of CONTEXT_FIELDS) {
    delete next[field]
  }
  return next
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
      const updateDefault = async (updatePayload: Partial<ChannelProfileInput>) =>
        supabase
          .from('channel_profiles')
          .update(updatePayload)
          .eq('id', existing.id)
          .eq('user_id', input.user_id)
          .select('*')
          .single<ChannelProfileRow>()

      let { data, error } = await updateDefault(payload)
      if (error && isUndefinedColumnError(error)) {
        ;({ data, error } = await updateDefault(stripContextFields(payload)))
      }

      if (error) {
        throw error
      }
      return data
    }

    const insertDefault = async (insertPayload: ChannelProfileInput) =>
      supabase
        .from('channel_profiles')
        .insert(insertPayload)
        .select('*')
        .single<ChannelProfileRow>()

    let { data, error } = await insertDefault(payload)
    if (error && isUndefinedColumnError(error)) {
      ;({ data, error } = await insertDefault(stripContextFields(payload)))
    }

    if (error) {
      throw error
    }
    return data
  },

  async create(input: ChannelProfileInput) {
    const createProfile = async (createPayload: ChannelProfileInput) =>
      supabase
        .from('channel_profiles')
        .insert(createPayload)
        .select('*')
        .single<ChannelProfileRow>()

    let { data, error } = await createProfile(input)
    if (error && isUndefinedColumnError(error)) {
      ;({ data, error } = await createProfile(stripContextFields(input)))
    }

    if (error) {
      throw error
    }

    return data
  },

  async update(id: string, userId: string, updates: Partial<ChannelProfileInput>) {
    const updateProfile = async (updatePayload: Partial<ChannelProfileInput>) =>
      supabase
        .from('channel_profiles')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single<ChannelProfileRow>()

    let { data, error } = await updateProfile(updates)
    if (error && isUndefinedColumnError(error)) {
      ;({ data, error } = await updateProfile(stripContextFields(updates)))
    }

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
