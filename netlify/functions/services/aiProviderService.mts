import OpenAI from 'openai'

const getEnv = (name: string): string | undefined => {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get: (key: string) => string | undefined } } }).Netlify?.env
  return netlifyEnv?.get(name) || process.env[name]
}

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || raw.trim()
  const objectStart = candidate.indexOf('{')
  const arrayStart = candidate.indexOf('[')
  const useArray = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)
  const start = useArray ? arrayStart : objectStart
  const end = useArray ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('The AI provider returned non-JSON output.')
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

type RunAiInput = {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
  signal?: AbortSignal
}

const SAMPLING_PARAMS = ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty'] as const

type OpenAIRequestOptions = {
  model: string
  reasoning_effort: 'low' | 'medium' | 'high'
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  response_format: { type: 'json_object' }
  messages: Array<{ role: 'system' | 'user'; content: string }>
}

const shouldOmitSamplingParams = (model: string) => {
  const normalized = model.toLowerCase()
  return normalized.includes('gpt-5') || normalized.includes('o3') || normalized.includes('o4')
}

const sanitizeOpenAIRequestOptions = (options: OpenAIRequestOptions): OpenAIRequestOptions => {
  if (!shouldOmitSamplingParams(options.model)) {
    return options
  }

  const sanitized = { ...options }
  const removed = SAMPLING_PARAMS.filter((param) => sanitized[param] !== undefined)

  for (const param of removed) {
    delete sanitized[param]
  }

  if (removed.length > 0) {
    console.info(`[openai] omitted unsupported sampling params for ${options.model}: ${removed.join(', ')}`)
  }

  return sanitized
}

const callOpenAI = async ({
  systemPrompt,
  userPrompt,
  temperature = 0.8,
  top_p,
  frequency_penalty,
  presence_penalty,
  reasoningEffort = 'medium',
  signal,
}: RunAiInput) => {
  const apiKey = getEnv('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const model = getEnv('AI_MODEL_OPENAI') || 'gpt-5-mini'
  const sdkTimeoutMs = Number(getEnv('OPENAI_SDK_TIMEOUT_MS') || 45000)
  const client = new OpenAI({
    apiKey,
    timeout: sdkTimeoutMs,
  })

  const requestOptions = sanitizeOpenAIRequestOptions({
    model,
    reasoning_effort: reasoningEffort,
    temperature,
    top_p,
    frequency_penalty,
    presence_penalty,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const startedAt = Date.now()
  console.info('[openai:start]', {
    model,
    sdkTimeoutMs,
    userPromptChars: userPrompt.length,
    systemPromptChars: systemPrompt.length,
    hasAbortSignal: Boolean(signal),
  })

  try {
    const response = await client.chat.completions.create(requestOptions, { signal })
    const durationMs = Date.now() - startedAt
    const content = response.choices[0]?.message?.content || ''
    console.info('[openai:complete]', {
      model,
      durationMs,
      finishReason: response.choices[0]?.finish_reason || null,
      responseChars: typeof content === 'string' ? content.length : 0,
    })
    return extractJson(typeof content === 'string' ? content : '')
  } catch (error) {
    const durationMs = Date.now() - startedAt
    console.error('[openai:error]', {
      model,
      durationMs,
      aborted: signal?.aborted ?? false,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const runAiJson = async (input: RunAiInput) => callOpenAI(input)

export class AiTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms.`)
    this.name = 'AiTimeoutError'
  }
}

export const runAiJsonWithTimeout = async (input: Omit<RunAiInput, 'signal'>, timeoutMs: number) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  console.info('[openai:step:start]', {
    timeoutMs,
    userPromptChars: input.userPrompt.length,
  })

  try {
    const result = await callOpenAI({ ...input, signal: controller.signal })
    console.info('[openai:step:complete]', {
      timeoutMs,
      durationMs: Date.now() - startedAt,
    })
    return result
  } catch (error) {
    const durationMs = Date.now() - startedAt
    if (controller.signal.aborted) {
      console.warn('[openai:step:timeout]', { timeoutMs, durationMs })
      throw new AiTimeoutError(timeoutMs)
    }
    console.error('[openai:step:error]', {
      timeoutMs,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
