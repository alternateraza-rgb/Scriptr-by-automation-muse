import { failure, parseJsonBody, success } from './utils/response.mts'

type FetchStatsRequest = {
  channelId?: string
}

type YouTubeChannelItem = {
  id?: string
  snippet?: {
    publishedAt?: string
  }
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string
    }
  }
  statistics?: {
    subscriberCount?: string
    viewCount?: string
    videoCount?: string
  }
}

type PlaylistItem = {
  contentDetails?: {
    videoId?: string
  }
}

type VideoItem = {
  contentDetails?: {
    duration?: string
  }
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

const fetchJson = async <T>(url: URL | string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) {
    throw new Error(`YouTube request failed (${response.status}).`)
  }
  return (await response.json()) as T
}

const buildDurationLabel = (seconds: number) => {
  if (seconds <= 0) {
    return 'Unknown'
  }
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }
  return `${minutes}m ${remainingSeconds}s`
}

const parseIsoDurationToSeconds = (isoDuration: string | undefined) => {
  if (!isoDuration) {
    return 0
  }
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) {
    return 0
  }
  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)
  return hours * 3600 + minutes * 60 + seconds
}

const getMonthsSince = (value: string | undefined) => {
  if (!value) {
    return 1
  }
  const createdAt = new Date(value)
  if (Number.isNaN(createdAt.getTime())) {
    return 1
  }
  const diffMs = Date.now() - createdAt.getTime()
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375)
  return Math.max(1, months)
}

const fetchLatestUploadVideoIds = async (playlistId: string, apiKey: string) => {
  const endpoint = new URL(`${YOUTUBE_API_BASE}/playlistItems`)
  endpoint.searchParams.set('part', 'contentDetails')
  endpoint.searchParams.set('playlistId', playlistId)
  endpoint.searchParams.set('maxResults', '50')
  endpoint.searchParams.set('key', apiKey)

  const payload = await fetchJson<{ items?: PlaylistItem[] }>(endpoint)
  const items = Array.isArray(payload.items) ? payload.items : []
  return items
    .map((item) => item.contentDetails?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId))
}

const fetchAverageVideoLengthSeconds = async (videoIds: string[], apiKey: string) => {
  if (!videoIds.length) {
    return 0
  }

  const endpoint = new URL(`${YOUTUBE_API_BASE}/videos`)
  endpoint.searchParams.set('part', 'contentDetails')
  endpoint.searchParams.set('id', videoIds.join(','))
  endpoint.searchParams.set('maxResults', String(videoIds.length))
  endpoint.searchParams.set('key', apiKey)

  const payload = await fetchJson<{ items?: VideoItem[] }>(endpoint)
  const items = Array.isArray(payload.items) ? payload.items : []
  const durations = items.map((item) => parseIsoDurationToSeconds(item.contentDetails?.duration)).filter((value) => value > 0)
  if (!durations.length) {
    return 0
  }
  return durations.reduce((sum, value) => sum + value, 0) / durations.length
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<FetchStatsRequest>(req)
    const channelId = body.channelId?.trim()
    if (!channelId) {
      return failure('Please provide a channel ID.', 400)
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return failure('YouTube stats are unavailable right now.', 503)
    }

    const channelEndpoint = new URL(`${YOUTUBE_API_BASE}/channels`)
    channelEndpoint.searchParams.set('part', 'snippet,statistics,contentDetails')
    channelEndpoint.searchParams.set('id', channelId)
    channelEndpoint.searchParams.set('key', apiKey)

    const channelPayload = await fetchJson<{ items?: YouTubeChannelItem[] }>(channelEndpoint)
    const channel = channelPayload.items?.[0]
    if (!channel?.id) {
      return failure('Unable to find this YouTube channel.', 404)
    }

    const totalSubscribers = Number(channel.statistics?.subscriberCount || 0)
    const totalChannelViews = Number(channel.statistics?.viewCount || 0)
    const totalVideos = Number(channel.statistics?.videoCount || 0)
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads
    const monthsSinceCreated = getMonthsSince(channel.snippet?.publishedAt)
    const uploadsPerMonth = totalVideos > 0 ? Number((totalVideos / monthsSinceCreated).toFixed(1)) : 0

    const videoIds = uploadsPlaylistId ? await fetchLatestUploadVideoIds(uploadsPlaylistId, apiKey) : []
    const averageVideoLengthSeconds = await fetchAverageVideoLengthSeconds(videoIds, apiKey)

    return success({
      stats: {
        channelId: channel.id,
        totalSubscribers,
        totalChannelViews,
        totalVideos,
        uploadsPerMonth,
        averageVideoLengthSeconds,
        averageVideoLengthLabel: buildDurationLabel(averageVideoLengthSeconds),
      },
    })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Unable to load YouTube channel stats.')
  }
}
