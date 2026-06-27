import { runAiJson } from './aiProviderService.mts'

const MAX_INPUT_WORDS = 5000

const SYSTEM_PROMPT = `You are an expert YouTube SEO strategist. The user will provide a video script, summary, or topic. Analyze the text and generate a highly optimized list of 15-20 YouTube hashtags. The list must include a mix of broad, high-volume tags and specific, niche tags relevant to the content. Output ONLY the hashtags separated by spaces (e.g., #ExampleTag #AnotherTag #SEO). Do not include any conversational filler, introductory text, or bullet points.`

const countWords = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  return trimmed.split(/\s+/).filter(Boolean).length
}

const hashtagsPrompt = (content: string) => `Video script, summary, or topic:
${content}

Task:
Generate 15-20 optimized YouTube hashtags based on the content above.

Return JSON only in this shape:
{
  "hashtags": "#ExampleTag #AnotherTag #SEO"
}

Rules:
- Return hashtags as a single space-separated string inside hashtags.
- Each hashtag must start with #.
- No introductory text, bullet points, or markdown.
- Do not include JSON keys in the hashtags string.
`

export type GenerateYouTubeHashtagsRequest = {
  content: string
}

export type GenerateYouTubeHashtagsResponse = {
  hashtags: string
}

export const generateYouTubeHashtags = async (
  input: GenerateYouTubeHashtagsRequest,
): Promise<GenerateYouTubeHashtagsResponse> => {
  const content = typeof input.content === 'string' ? input.content.trim() : ''

  if (!content) {
    throw new Error('Please provide a video script, topic, or description.')
  }

  const wordCount = countWords(content)
  if (wordCount > MAX_INPUT_WORDS) {
    throw new Error(`Input exceeds the ${MAX_INPUT_WORDS.toLocaleString()}-word limit (${wordCount.toLocaleString()} words).`)
  }

  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: hashtagsPrompt(content),
    temperature: 0.7,
  })) as Partial<GenerateYouTubeHashtagsResponse>

  const hashtags = typeof output.hashtags === 'string' ? output.hashtags.trim() : ''
  if (!hashtags) {
    throw new Error('Hashtag generation returned an invalid payload.')
  }

  return { hashtags }
}
