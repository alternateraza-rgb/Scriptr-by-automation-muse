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
}

const callOpenAI = async ({ systemPrompt, userPrompt, temperature = 0.8 }: RunAiInput) => {
  const apiKey = getEnv('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const client = new OpenAI({
    apiKey,
    timeout: 45000,
  })

  const model = getEnv('AI_MODEL_OPENAI') || 'gpt-4.1-mini'
  const response = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = response.choices[0]?.message?.content || ''
  return extractJson(typeof content === 'string' ? content : '')
}

export const runAiJson = async (input: RunAiInput) => callOpenAI(input)
