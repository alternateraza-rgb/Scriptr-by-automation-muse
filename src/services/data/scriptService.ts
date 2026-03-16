import { supabase } from '../../lib/supabase'
import type { ScriptRow } from './types'

export type ScriptUpsertInput = {
  id?: string
  user_id: string
  channel_profile_id: string | null
  title: string
  selected_title: string | null
  idea: string | null
  outline: string | null
  full_script: string | null
  status: string | null
  word_count: number | null
  niche: string | null
  tone: string | null
  script_type: string | null
  favorite: boolean
}

export const scriptService = {
  async listByUserId(userId: string) {
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .returns<ScriptRow[]>()

    if (error) {
      throw error
    }

    return data ?? []
  },

  async upsertScript(input: ScriptUpsertInput) {
    const payload = { ...input }

    const { data, error } = await supabase
      .from('scripts')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single<ScriptRow>()

    if (error) {
      throw error
    }

    return data
  },

  async updateScript(id: string, userId: string, updates: Partial<ScriptUpsertInput>) {
    const { data, error } = await supabase
      .from('scripts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single<ScriptRow>()

    if (error) {
      throw error
    }

    return data
  },

  async deleteScript(id: string, userId: string) {
    const { error } = await supabase.from('scripts').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      throw error
    }
  },
}
