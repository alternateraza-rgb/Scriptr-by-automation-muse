import { callAiFunction } from './aiProviderService'
import type { ChannelContext, VideoIdea } from './types'

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

const sanitizeText = (value: unknown) => {
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

const normalizeOutlierStatus = (value: unknown): 'Low' | 'Medium' | 'High' => {
  if (typeof value !== 'string') {
    return 'Medium'
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'low') {
    return 'Low'
  }
  if (normalized === 'high') {
    return 'High'
  }
  return 'Medium'
}

const normalizeClickScore = (value: unknown): 'low' | 'medium' | 'high' => {
  if (typeof value !== 'string') {
    return 'high'
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'low') {
    return 'low'
  }
  if (normalized === 'medium') {
    return 'medium'
  }
  return 'high'
}

const normalizeInspirationVideo = (value: unknown): VideoIdea['inspirationVideo'] => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const source = value as Record<string, unknown>
  const videoId = typeof source.videoId === 'string' ? source.videoId.trim() : ''
  const title = sanitizeText(source.title)
  const channelTitle = sanitizeText(source.channelTitle)
  const publishedAt = typeof source.publishedAt === 'string' ? source.publishedAt.trim() : ''

  if (!videoId || !title || !channelTitle || !publishedAt) {
    return undefined
  }

  const videoUrl =
    typeof source.videoUrl === 'string' && source.videoUrl.trim()
      ? source.videoUrl.trim()
      : `https://www.youtube.com/watch?v=${videoId}`

  const toSafeCount = (candidate: unknown) => {
    const parsed = typeof candidate === 'number' ? candidate : Number(candidate)
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0
  }

  return {
    videoId,
    title,
    channelTitle,
    thumbnail: typeof source.thumbnail === 'string' ? source.thumbnail.trim() : '',
    publishedAt,
    views: toSafeCount(source.views),
    likes: toSafeCount(source.likes),
    comments: toSafeCount(source.comments),
    estimatedRevenue: toSafeCount(source.estimatedRevenue),
    videoUrl,
    viralLiftDate: typeof source.viralLiftDate === 'string' ? source.viralLiftDate.trim() : undefined,
    angleLabel: sanitizeText(source.angleLabel) || undefined,
  }
}

const normalizeInspirationVideos = (value: unknown): VideoIdea['inspirationVideos'] => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const videos = value
    .map((entry) => normalizeInspirationVideo(entry))
    .filter((entry): entry is NonNullable<VideoIdea['inspirationVideo']> => Boolean(entry))

  if (!videos.length) {
    return undefined
  }

  return [...new Map(videos.map((video) => [video.videoId, video])).values()].slice(0, 3)
}

export async function generateIdeas(channelContext: ChannelContext): Promise<{ ideas: VideoIdea[] }> {
  const profileText = channelContext.channelProfile || ''
  const payload = {
    niche: channelContext.niche,
    videoTopicIdea: channelContext.videoTopicIdea,
    targetAudience: channelContext.targetAudience || channelContext.audience,
    tone: channelContext.tone,
    videoLength: channelContext.videoLength,
    videoFormat: channelContext.videoFormat,
    exampleChannels: channelContext.exampleChannels || [],
    userNotes: channelContext.userNotes,
    channelStage: channelContext.channelStage,
    channelProfileText: profileText,
    channelProfile: {
      channelName: channelContext.channelName,
      exampleChannels: channelContext.exampleChannels || [],
      userNotes: channelContext.userNotes,
    },
    channelContext,
  }

  const data = await callAiFunction<{ ideas?: VideoIdea[] }>('generateIdeas', payload)

  if (!Array.isArray(data.ideas) || data.ideas.length === 0) {
    throw new Error('Idea generation returned no ideas.')
  }

  const ideas = data.ideas.slice(0, 3).map((idea) => {
    const normalizedInspirationVideos = normalizeInspirationVideos((idea as { inspirationVideos?: unknown }).inspirationVideos)
    const normalizedPrimaryVideo = normalizeInspirationVideo(idea?.inspirationVideo)

    return {
      ...idea,
      title: sanitizeText(idea?.title) || 'Untitled Idea',
      concept: sanitizeText(idea?.concept) || '',
      why_it_works: sanitizeText(idea?.why_it_works) || '',
      hook_angle: sanitizeText(idea?.hook_angle) || '',
      click_score: normalizeClickScore(idea?.click_score),
      outlierStatus: normalizeOutlierStatus(idea?.outlierStatus),
      inspirationVideos: normalizedInspirationVideos || (normalizedPrimaryVideo ? [normalizedPrimaryVideo] : undefined),
      inspirationVideo: normalizedPrimaryVideo || normalizedInspirationVideos?.[0],
    }
  })

  return { ideas }
}
