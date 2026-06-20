import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ScriptGenerationJobStatus = 'queued' | 'generating' | 'completed' | 'failed'

export type ScriptGenerationJobRecord = {
  id: string
  user_id: string
  status: ScriptGenerationJobStatus
  request_payload: unknown
  progress: unknown
  result: unknown
  error_message: string | null
  created_at: string
  updated_at: string
}

export type ScriptGenerationJobUpdate = {
  status?: ScriptGenerationJobStatus
  progress?: unknown
  result?: unknown
  error_message?: string | null
}

type AuthedJobClient = {
  supabase: SupabaseClient
  userId: string
}

const getEnv = (name: string): string | undefined => {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get: (key: string) => string | undefined } } }).Netlify?.env
  return netlifyEnv?.get(name) || process.env[name]
}

const getSupabaseConfig = () => {
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
  const anonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY')

  if (!url || !anonKey) {
    throw new Error('Supabase configuration is missing for script generation jobs.')
  }

  return { url, anonKey }
}

export const createAuthedJobClient = async (req: Request): Promise<AuthedJobClient> => {
  const authorization = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    throw new Error('Sign in again to generate scripts.')
  }

  const { url, anonKey } = getSupabaseConfig()
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.id) {
    throw new Error('Sign in again to generate scripts.')
  }

  return { supabase, userId: data.user.id }
}

export const insertScriptGenerationJob = async (
  supabase: SupabaseClient,
  userId: string,
  requestPayload: unknown,
  progress: unknown,
) => {
  const { data, error } = await supabase
    .from('script_generation_jobs')
    .insert({
      user_id: userId,
      status: 'queued',
      request_payload: requestPayload,
      progress,
      error_message: null,
    })
    .select('*')
    .single<ScriptGenerationJobRecord>()

  if (error) {
    throw error
  }

  return data
}

export const getScriptGenerationJob = async (supabase: SupabaseClient, userId: string, jobId: string) => {
  const { data, error } = await supabase
    .from('script_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single<ScriptGenerationJobRecord>()

  if (error) {
    throw error
  }

  return data
}

export const updateScriptGenerationJob = async (
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  updates: ScriptGenerationJobUpdate,
) => {
  const { data, error } = await supabase
    .from('script_generation_jobs')
    .update(updates)
    .eq('id', jobId)
    .eq('user_id', userId)
    .select('*')
    .single<ScriptGenerationJobRecord>()

  if (error) {
    throw error
  }

  return data
}
