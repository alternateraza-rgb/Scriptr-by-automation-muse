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
  content_pillars: string | null
  example_channels: string | null
  topic_focus: string | null
  user_notes: string | null
  video_length: string | null
  generated_ideas: string | null
  script_type: string | null
  favorite: boolean
}

const logScriptWrite = (operation: string, payload: unknown) => {
  console.log(`[scripts:${operation}] payload`, payload)
}

const parseMissingColumn = (error: unknown): string | null => {
  const message = typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: unknown }).message : null
  if (typeof message !== 'string') {
    return null
  }

  const quotedMatch = message.match(/'([^']+)'/)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const plainMatch = message.match(/column\s+([a-zA-Z0-9_]+)/i)
  return plainMatch?.[1] || null
}

const withSchemaFallback = async <T>(
  operation: string,
  initialPayload: Record<string, unknown>,
  request: (payload: Record<string, unknown>) => Promise<T>,
): Promise<T> => {
  const payload: Record<string, unknown> = { ...initialPayload }
  const removedColumns = new Set<string>()

  while (true) {
    try {
      return await request(payload)
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : null
      const missingColumn = parseMissingColumn(error)

      // Some deployments lag migrations; drop unknown optional fields and retry.
      if (errorCode === 'PGRST204' && missingColumn && missingColumn in payload && !removedColumns.has(missingColumn)) {
        removedColumns.add(missingColumn)
        delete payload[missingColumn]
        console.warn(`[scripts:${operation}] retrying without missing column "${missingColumn}"`)
        continue
      }

      // If selected profile no longer exists, save script with null profile relation.
      if (errorCode === '23503' && payload.channel_profile_id) {
        payload.channel_profile_id = null
        console.warn(`[scripts:${operation}] retrying with channel_profile_id=null after foreign-key failure`)
        continue
      }

      throw error
    }
  }
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
      console.error('[scripts:listByUserId] fetch error', { userId, error })
      throw error
    }

    return data ?? []
  },

  async upsertScript(input: ScriptUpsertInput) {
    const payload: Record<string, unknown> = { ...input, id: input.id || crypto.randomUUID() }
    logScriptWrite('upsert', payload)

    try {
      return await withSchemaFallback('upsertScript', payload, async (safePayload) => {
        const { data, error } = await supabase
          .from('scripts')
          .upsert(safePayload, { onConflict: 'id' })
          .select('*')
          .single<ScriptRow>()

        if (error) {
          throw error
        }

        return data
      })
    } catch (error) {
      console.error('[scripts:upsertScript] save error', { payload, error })
      throw error
    }
  },

  async insertScript(input: Omit<ScriptUpsertInput, 'id'> & { id?: string }) {
    const payload: Record<string, unknown> = { ...input, id: input.id || crypto.randomUUID() }
    logScriptWrite('insert', payload)

    try {
      return await withSchemaFallback('insertScript', payload, async (safePayload) => {
        const { data, error } = await supabase
          .from('scripts')
          .insert(safePayload)
          .select('*')
          .single<ScriptRow>()

        if (error) {
          throw error
        }

        return data
      })
    } catch (error) {
      console.error('[scripts:insertScript] save error', { payload, error })
      throw error
    }
  },

  async updateScript(id: string, userId: string, updates: Partial<ScriptUpsertInput>) {
    logScriptWrite('update', { id, user_id: userId, ...updates })

    const payload: Record<string, unknown> = { ...updates }

    try {
      return await withSchemaFallback('updateScript', payload, async (safePayload) => {
        const { data, error } = await supabase
          .from('scripts')
          .update(safePayload)
          .eq('id', id)
          .eq('user_id', userId)
          .select('*')
          .single<ScriptRow>()

        if (error) {
          throw error
        }

        return data
      })
    } catch (error) {
      console.error('[scripts:updateScript] save error', { id, userId, updates, error })
      throw error
    }
  },

  async deleteScript(id: string, userId: string) {
    const { error } = await supabase.from('scripts').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      console.error('[scripts:deleteScript] save error', { id, userId, error })
      throw error
    }
  },
}
