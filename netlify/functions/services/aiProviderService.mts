import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

type ProviderName = 'anthropic' | 'openai'

const getEnv = (name: string): string | undefined => {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get: (key: string) => string | undefined } } }).Netlify?.env
  return netlifyEnv?.get(name) || process.env[name]
}

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() || raw.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('The AI provider returned non-JSON output.')
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

const pickProvider = (): ProviderName => {
  const configured = (getEnv('AI_PROVIDER') || '').toLowerCase()
  if (configured === 'openai') {
    return 'openai'
  }
  if (configured === 'anthropic') {
    return 'anthropic'
  }

  if (getEnv('ANTHROPIC_API_KEY')) {
    return 'anthropic'
  }

  if (getEnv('OPENAI_API_KEY')) {
    return 'openai'
  }

  return 'anthropic'
}

const callAnthropic = async (prompt: string) => {
  const client = new Anthropic({
    ...(getEnv('ANTHROPIC_API_KEY') ? { apiKey: getEnv('ANTHROPIC_API_KEY') } : {}),
    timeout: 45000,
  })

  const model = getEnv('AI_MODEL_ANTHROPIC') || 'claude-sonnet-4-5-20250929'

  const response = await client.messages.create({
    model,
    max_tokens: 2600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .map((part) => {
      if ('text' in part && typeof part.text === 'string') {
        return part.text
      }
      return ''
    })
    .join('\n')

  return extractJson(text)
}

const callOpenAI = async (prompt: string) => {
  const client = new OpenAI({
    ...(getEnv('OPENAI_API_KEY') ? { apiKey: getEnv('OPENAI_API_KEY') } : {}),
    timeout: 45000,
  })

  const model = getEnv('AI_MODEL_OPENAI') || 'gpt-4o-mini'

  const response = await client.responses.create({
    model,
    input: prompt,
  })

  return extractJson(response.output_text || '')
}

export const runAiJson = async (prompt: string) => {
  const provider = pickProvider()

  if (provider === 'openai') {
    return callOpenAI(prompt)
  }

  return callAnthropic(prompt)
}

export const getConfiguredProvider = () => pickProvider()
