import { supabase } from '../lib/supabase'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './types'

type ScriptPayload = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedTitle: string
  generatedOutline: OutlineSection[]
  tone?: string
  videoLength?: string
}

type ScriptGenerationJobStatus = 'queued' | 'generating' | 'completed' | 'failed'

type ScriptGenerationJob = {
  jobId: string
  status: ScriptGenerationJobStatus
  currentStep: 'outline' | 'section' | 'polish' | 'completed'
  currentSectionIndex: number
  totalSections: number
  completedSections: number
  retryAfterMs: number
  error: string | null
  script?: GeneratedScript
}

const MAX_SCRIPT_JOB_POLLS = 120
const DEFAULT_POLL_INTERVAL_MS = 1200
const SCRIPT_JOB_STORAGE_PREFIX = 'scriptr:script-generation-job:'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

const hashPayload = (payload: ScriptPayload) => {
  let hash = 0
  const input = stableStringify(payload)
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return `${SCRIPT_JOB_STORAGE_PREFIX}${Math.abs(hash)}`
}

const getStoredJobId = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

const setStoredJobId = (storageKey: string, jobId: string) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(storageKey, jobId)
  } catch {
    // Local storage is an optional resume aid; polling still works without it.
  }
}

const clearStoredJobId = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.removeItem(storageKey)
  } catch {
    // Ignore storage failures.
  }
}

const getAuthHeaders = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Sign in again to generate scripts.')
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

const callScriptGenerationFunction = async <TResponse>(functionName: string, payload: unknown): Promise<TResponse> => {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(`/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  let parsed: { success?: boolean; data?: TResponse; error?: string } | null = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    throw new Error(response.ok ? 'Invalid JSON response from script generation.' : `Script generation failed with status ${response.status}.`)
  }

  if (!response.ok || parsed?.success === false) {
    throw new Error(parsed?.error || `Script generation failed with status ${response.status}.`)
  }

  return (parsed?.data ?? ({} as TResponse)) as TResponse
}

const pollScriptGenerationJob = async (jobId: string): Promise<GeneratedScript> => {
  for (let pollCount = 0; pollCount < MAX_SCRIPT_JOB_POLLS; pollCount += 1) {
    const data = await callScriptGenerationFunction<{ job?: ScriptGenerationJob }>('generateScriptStatus', { jobId })
    const job = data.job
    if (!job) {
      throw new Error('Script generation returned an invalid job status.')
    }

    if (job.status === 'completed') {
      if (!job.script?.script?.sections?.length) {
        throw new Error('Script generation completed without a valid script.')
      }
      return job.script
    }

    if (job.status === 'failed') {
      throw new Error(job.error || 'Script generation failed. Please try again.')
    }

    await delay(Math.max(DEFAULT_POLL_INTERVAL_MS, job.retryAfterMs || 0))
  }

  throw new Error('Script generation is still running. Retry to resume from the latest saved section.')
}

const shouldPreserveStoredJob = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return (
    message.includes('still running') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('status could not be updated')
  )
}

export async function generateScript(payload: ScriptPayload): Promise<GeneratedScript> {
  const storageKey = hashPayload(payload)
  const storedJobId = getStoredJobId(storageKey)

  if (storedJobId) {
    try {
      const script = await pollScriptGenerationJob(storedJobId)
      clearStoredJobId(storageKey)
      return script
    } catch (error) {
      if (shouldPreserveStoredJob(error)) {
        throw error
      }
      clearStoredJobId(storageKey)
    }
  }

  const data = await callScriptGenerationFunction<{ job?: ScriptGenerationJob }>('generateScript', payload)
  const job = data.job
  if (!job?.jobId) {
    throw new Error('Script generation could not be started.')
  }

  setStoredJobId(storageKey, job.jobId)
  const script = await pollScriptGenerationJob(job.jobId)
  clearStoredJobId(storageKey)
  return script
}
