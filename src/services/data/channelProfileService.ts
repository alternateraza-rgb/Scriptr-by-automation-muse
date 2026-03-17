import { supabase } from '../../lib/supabase'
import type { ChannelProfileRow } from './types'

export type ChannelProfileInput = {
  user_id: string
  channel_name?: string | null
  niche: string | null
  audience: string | null
  tone: string | null
  monetization_goal: string | null
  is_default?: boolean
}

const PROFILE_WRITABLE_FIELDS = [
  'user_id',
  'channel_name',
  'niche',
  'audience',
  'tone',
  'monetization_goal',
  'is_default',
] as const

const toWritablePayload = (payload: Partial<ChannelProfileInput>): Partial<ChannelProfileInput> => {
  const next: Partial<ChannelProfileInput> = {}
  for (const field of PROFILE_WRITABLE_FIELDS) {
    if (payload[field] !== undefined) {
      ;(next as Record<string, unknown>)[field] = payload[field]
    }
  }
  return next
}

const cleanChannelName = (value: string | null | undefined) => {
  const normalized = value?.trim()
  if (!normalized || normalized === 'Untitled Channel') {
    return null
  }
  return normalized
}

const logProfileWrite = (payload: Partial<ChannelProfileInput>) => {
  console.log('Updating channel profile:', payload)
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
    const payload = toWritablePayload({ ...input, is_default: true })
    const { data: existingRows, error: existingError } = await supabase
      .from('channel_profiles')
      .select('*')
      .eq('user_id', input.user_id)
      .eq('is_default', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .returns<ChannelProfileRow[]>()

    if (existingError) {
      throw existingError
    }

    const existing = existingRows?.[0] || null
    const resolvedChannelName =
      cleanChannelName(payload.channel_name) ||
      existing?.channel_name ||
      (!existing ? 'Untitled Channel' : null)

    if (existing) {
      const updatePayload = toWritablePayload({
        ...payload,
        channel_name: resolvedChannelName ?? undefined,
      })

      logProfileWrite(updatePayload)
      const { data, error } = await supabase
        .from('channel_profiles')
        .update(updatePayload)
        .eq('id', existing.id)
        .eq('user_id', input.user_id)
        .select('*')
        .single<ChannelProfileRow>()

      if (error) {
        throw error
      }
      return data
    }

    const insertPayload = toWritablePayload({
      ...payload,
      channel_name: resolvedChannelName || 'Untitled Channel',
    }) as ChannelProfileInput

    logProfileWrite(insertPayload)
    const { data, error } = await supabase
      .from('channel_profiles')
      .insert(insertPayload)
      .select('*')
      .single<ChannelProfileRow>()

    if (error) {
      throw error
    }
    return data
  },

  async create(input: ChannelProfileInput) {
    const payload = toWritablePayload({
      ...input,
      channel_name: cleanChannelName(input.channel_name) || 'Untitled Channel',
    }) as ChannelProfileInput

    logProfileWrite(payload)
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

  async update(id: string, userId: string, updates: Partial<ChannelProfileInput>) {
    const payload = toWritablePayload(updates)
    const sanitizedName = cleanChannelName(payload.channel_name)

    if (payload.channel_name !== undefined && !sanitizedName) {
      delete payload.channel_name
    } else if (sanitizedName) {
      payload.channel_name = sanitizedName
    }

    logProfileWrite(payload)
    const { data, error } = await supabase
      .from('channel_profiles')
      .update(payload)
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
