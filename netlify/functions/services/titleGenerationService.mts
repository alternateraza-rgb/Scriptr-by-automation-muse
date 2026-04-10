import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, TitlePayload, VideoIdea } from './types.mts'

const SYSTEM_PROMPT = 'You are a professional YouTube script writer creating high-retention scripts for faceless channels.'

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, numeric: string) => {
      const codePoint = Number.parseInt(numeric, 10)
      if (!Number.isFinite(codePoint)) {
        return ''
      }
      return String.fromCodePoint(codePoint)
    })

const sanitizeTitle = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  const cleaned = decodeHtmlEntities(value)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u2014\u2013]/g, ' - ')
    .replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, '')
    .replace(/^\s*(?:\d+[\).:\]-]\s*|[-*•]+\s*)/g, '')

  return normalizeWhitespace(cleaned)
}

const titlePrompt = (context: ChannelContext, selectedIdea: VideoIdea) => `Channel profile context:
${JSON.stringify(context, null, 2)}

Selected idea:
${JSON.stringify(selectedIdea, null, 2)}

Task:
Generate exactly 3 YouTube titles optimized for CTR.

Return JSON only in this shape:
{
  "titles": [
    "Title option 1",
    "Title option 2",
    "Title option 3"
  ]
}

Rules:
- Curiosity-driven and concise.
- Strongly aligned with niche and idea.
- Avoid repetitive wording.
- Keep each title under 75 characters.
- No markdown.`

const fallbackTitles = (context: ChannelContext, selectedIdea: VideoIdea) => {
  const topic = sanitizeTitle(selectedIdea.title) || sanitizeTitle(context.videoTopicIdea) || 'This Topic'
  return [
    `${topic}: What Most People Get Wrong`,
    `The Hidden Truth Behind ${topic}`,
    `Before You Try ${topic}, Watch This`,
  ]
}

export const generateTitles = async (context: ChannelContext, selectedIdea: VideoIdea): Promise<TitlePayload> => {
  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: titlePrompt(context, selectedIdea),
    temperature: 0.9,
  })) as Partial<TitlePayload>

  const titles = Array.isArray(output.titles)
    ? output.titles
        .map((title) => sanitizeTitle(title))
        .filter(Boolean)
    : []
  const deduped = [...new Set(titles)]
  const safeTitles = [...deduped, ...fallbackTitles(context, selectedIdea)].slice(0, 3)

  return { titles: safeTitles }
}
