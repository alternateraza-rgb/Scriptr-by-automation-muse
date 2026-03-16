import { supabase } from '../../lib/supabase'
import type { UsageStatsRow } from './types'

export const usageStatsService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<UsageStatsRow>()

    if (error) {
      throw error
    }

    return data
  },

  async ensure(userId: string) {
    const { data, error } = await supabase
      .from('usage_stats')
      .upsert(
        {
          user_id: userId,
          last_active_at: new Date().toISOString(),
          scripts_generated: 0,
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single<UsageStatsRow>()

    if (error) {
      throw error
    }

    return data
  },

  async markActive(userId: string) {
    const { data, error } = await supabase
      .from('usage_stats')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('*')
      .single<UsageStatsRow>()

    if (error) {
      throw error
    }

    return data
  },

  async incrementScriptsGenerated(userId: string) {
    const current = await this.getByUserId(userId)
    const scriptsGenerated = (current?.scripts_generated ?? 0) + 1

    const { data, error } = await supabase
      .from('usage_stats')
      .upsert(
        {
          user_id: userId,
          scripts_generated: scriptsGenerated,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('*')
      .single<UsageStatsRow>()

    if (error) {
      throw error
    }

    return data
  },
}
