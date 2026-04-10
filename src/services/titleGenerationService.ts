import { callAiFunction } from './aiProviderService'
import type { ChannelContext, TitlePayload, VideoIdea } from './types'

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

export async function generateTitles(channelContext: ChannelContext, selectedIdea: VideoIdea): Promise<TitlePayload> {
  const data = await callAiFunction<{ titles?: string[] }>('generateTitles', { channelContext, selectedIdea })
  if (!Array.isArray(data.titles) || data.titles.length === 0) {
    throw new Error('Title generation returned no titles.')
  }
  const cleanTitles = data.titles.map((title) => sanitizeTitle(title)).filter(Boolean)
  return {
    titles: [...new Set(cleanTitles)].slice(0, 3),
  }
}
