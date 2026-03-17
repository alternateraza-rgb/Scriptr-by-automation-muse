import { supabase } from '../../lib/supabase'
import type { OnboardingResponseRow } from './types'

export type OnboardingUpsertInput = {
  user_id: string
  niche: string | null
  income_goal: string | null
  channel_stage: string | null
  content_style: string | null
  audience: string | null
  channel_name: string | null
  upload_frequency: string | null
  tone: string | null
  age_range: string | null
  level: string | null
  pain_points: string | null
  primary_goal: string | null
  custom_niche: string | null
  custom_tone: string | null
  completed_at?: string | null
}

export const onboardingService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<OnboardingResponseRow>()

    if (error) {
      console.error('[onboarding_responses:getByUserId] fetch error', { userId, error })
      throw error
    }

    return data
  },

  async upsert(input: OnboardingUpsertInput) {
    const { data, error } = await supabase
      .from('onboarding_responses')
      .upsert(input, { onConflict: 'user_id' })
      .select('*')
      .single<OnboardingResponseRow>()

    if (error) {
      console.error('[onboarding_responses:upsert] save error', { payload: input, error })
      throw error
    }

    return data
  },

  async deleteByUserId(userId: string) {
    const { error } = await supabase.from('onboarding_responses').delete().eq('user_id', userId)

    if (error) {
      console.error('[onboarding_responses:deleteByUserId] save error', { userId, error })
      throw error
    }
  },
}
