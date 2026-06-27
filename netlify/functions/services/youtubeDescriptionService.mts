import { runAiJson } from './aiProviderService.mts'

const MAX_SCRIPT_WORDS = 5000

const SYSTEM_PROMPT = `You are an expert YouTube SEO strategist and copywriter. The user will provide a video script. Based on this script, generate a highly engaging, SEO-optimized YouTube video description. The description must include:

A catchy, hook-driven introductory paragraph.

A brief summary of the video's core value (what the viewer will learn/experience).

A 'Timestamps' section (create logical placeholders or infer them from the script structure).

Relevant SEO keywords naturally woven into the text.

A call to action (Subscribe, like, etc.) and placeholders for social links.
Keep the tone energetic and professional.`

const countWords = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  return trimmed.split(/\s+/).filter(Boolean).length
}

const descriptionPrompt = (script: string) => `Video script:
${script}

Task:
Generate a complete YouTube video description based on the script above.

Return JSON only in this shape:
{
  "description": "..."
}

Rules:
- Return the full description as plain text inside description.
- Preserve line breaks for readability.
- No markdown formatting.
- Do not include JSON keys in the description text.
`

export type GenerateYouTubeDescriptionRequest = {
  script: string
}

export type GenerateYouTubeDescriptionResponse = {
  description: string
}

export const generateYouTubeDescription = async (
  input: GenerateYouTubeDescriptionRequest,
): Promise<GenerateYouTubeDescriptionResponse> => {
  const script = typeof input.script === 'string' ? input.script.trim() : ''

  if (!script) {
    throw new Error('Please provide a video script.')
  }

  const wordCount = countWords(script)
  if (wordCount > MAX_SCRIPT_WORDS) {
    throw new Error(`Script exceeds the ${MAX_SCRIPT_WORDS.toLocaleString()}-word limit (${wordCount.toLocaleString()} words).`)
  }

  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: descriptionPrompt(script),
    temperature: 0.7,
  })) as Partial<GenerateYouTubeDescriptionResponse>

  const description = typeof output.description === 'string' ? output.description.trim() : ''
  if (!description) {
    throw new Error('Description generation returned an invalid payload.')
  }

  return { description }
}
