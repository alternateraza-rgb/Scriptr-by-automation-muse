import { failure, parseJsonBody, success } from './utils/response.mts'

type FetchChannelRequest = {
  channelUrl?: string
}

type YouTubeChannelItem = {
  id?: string
  snippet?: {
    title?: string
    description?: string
    customUrl?: string
    thumbnails?: {
      default?: { url?: string }
      medium?: { url?: string }
      high?: { url?: string }
    }
  }
  statistics?: {
    subscriberCount?: string
  }
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

const isYouTubeHost = (hostname: string) => {
  const normalized = hostname.toLowerCase()
  return (
    normalized === 'youtube.com' ||
    normalized === 'www.youtube.com' ||
    normalized === 'm.youtube.com' ||
    normalized === 'youtu.be' ||
    normalized === 'www.youtu.be'
  )
}

const normalizeYouTubeUrl = (value: string) => {
  const trimmed = value.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  if (!isYouTubeHost(url.hostname)) {
    throw new Error('Please enter a valid YouTube channel link.')
  }
  return url
}

const formatSubscriberCount = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

const normalizeProfilePhotoUrl = (value?: string) => {
  if (!value) {
    return ''
  }
  if (value.startsWith('//')) {
    return `https:${value}`
  }
  if (value.startsWith('http://')) {
    return value.replace('http://', 'https://')
  }
  return value
}

const fetchJson = async <T>(url: URL | string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(9000) })
  if (!response.ok) {
    throw new Error(`YouTube request failed (${response.status}).`)
  }
  return (await response.json()) as T
}

const fetchChannels = async (params: Record<string, string>, apiKey: string) => {
  const endpoint = new URL(`${YOUTUBE_API_BASE}/channels`)
  endpoint.searchParams.set('part', 'snippet,statistics')
  endpoint.searchParams.set('key', apiKey)
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      endpoint.searchParams.set(key, value)
    }
  }

  const payload = await fetchJson<{ items?: YouTubeChannelItem[] }>(endpoint)
  return Array.isArray(payload.items) ? payload.items : []
}

const fetchChannelsBySearch = async (query: string, apiKey: string) => {
  const endpoint = new URL(`${YOUTUBE_API_BASE}/search`)
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('type', 'channel')
  endpoint.searchParams.set('maxResults', '1')
  endpoint.searchParams.set('q', query)
  endpoint.searchParams.set('key', apiKey)
  const payload = await fetchJson<{ items?: Array<{ snippet?: { channelId?: string } }> }>(endpoint)
  const channelId = payload.items?.[0]?.snippet?.channelId
  if (!channelId) {
    return []
  }
  return fetchChannels({ id: channelId }, apiKey)
}

const fetchChannelByVideoId = async (videoId: string, apiKey: string) => {
  const endpoint = new URL(`${YOUTUBE_API_BASE}/videos`)
  endpoint.searchParams.set('part', 'snippet')
  endpoint.searchParams.set('id', videoId)
  endpoint.searchParams.set('key', apiKey)
  const payload = await fetchJson<{ items?: Array<{ snippet?: { channelId?: string } }> }>(endpoint)
  const channelId = payload.items?.[0]?.snippet?.channelId
  if (!channelId) {
    return null
  }
  const channels = await fetchChannels({ id: channelId }, apiKey)
  return channels[0] || null
}

const parseIdentifierFromPath = (path: string) => {
  const parts = path.split('/').filter(Boolean)
  if (!parts.length) {
    return {}
  }
  if (parts[0]?.startsWith('@')) {
    return { handle: parts[0].replace(/^@/, '') }
  }
  if (parts[0] === 'channel' && parts[1]) {
    return { channelId: parts[1] }
  }
  if (parts[0] === 'user' && parts[1]) {
    return { username: parts[1] }
  }
  if (parts[0] === 'c' && parts[1]) {
    return { customName: parts[1] }
  }
  if (parts[0] && !['watch', 'shorts', 'live', 'embed', 'playlist'].includes(parts[0])) {
    return { customName: parts[0] }
  }
  return {}
}

const parseVideoIdFromUrl = (url: URL) => {
  const parts = url.pathname.split('/').filter(Boolean)
  if (url.hostname.includes('youtu.be')) {
    return parts[0] || null
  }
  if (parts[0] === 'watch') {
    return url.searchParams.get('v')
  }
  if ((parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'embed') && parts[1]) {
    return parts[1]
  }
  return null
}

const resolveChannel = async (inputUrl: URL, apiKey: string) => {
  const { channelId, handle, username, customName } = parseIdentifierFromPath(inputUrl.pathname)
  const fallbackSearchTerms: string[] = []
  if (customName) {
    fallbackSearchTerms.push(customName.replace(/[-_]/g, ' '))
  }
  if (handle) {
    fallbackSearchTerms.push(handle.replace(/[-_]/g, ' '))
  }

  const videoId = parseVideoIdFromUrl(inputUrl)
  if (videoId) {
    const item = await fetchChannelByVideoId(videoId, apiKey)
    if (item) {
      return item
    }
  }

  if (channelId) {
    const items = await fetchChannels({ id: channelId }, apiKey)
    if (items[0]) {
      return items[0]
    }
  }

  if (handle) {
    const items = await fetchChannels({ forHandle: handle }, apiKey)
    if (items[0]) {
      return items[0]
    }
  }

  if (username) {
    const items = await fetchChannels({ forUsername: username }, apiKey)
    if (items[0]) {
      return items[0]
    }
  }

  for (const searchTerm of fallbackSearchTerms) {
    if (searchTerm) {
      const items = await fetchChannelsBySearch(searchTerm, apiKey)
      if (items[0]) {
        return items[0]
      }
    }
  }

  return null
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<FetchChannelRequest>(req)
    if (!body.channelUrl || !body.channelUrl.trim()) {
      return failure('Please provide a YouTube channel URL.', 400)
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return failure('YouTube import is unavailable right now.', 503)
    }

    const inputUrl = normalizeYouTubeUrl(body.channelUrl)
    const item = await resolveChannel(inputUrl, apiKey)

    if (!item?.id || !item.snippet) {
      return failure('Unable to find a channel from this link.', 404)
    }

    const subscriberCount = Number(item.statistics?.subscriberCount || 0)
    const profilePhotoUrl = normalizeProfilePhotoUrl(
      item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    )

    return success({
      channel: {
        channelId: item.id,
        channelUrl: `https://www.youtube.com/channel/${item.id}`,
        channelName: item.snippet.title || 'Untitled Channel',
        description: item.snippet.description || '',
        profilePhotoUrl,
        subscriberCount,
        subscriberCountLabel: formatSubscriberCount(subscriberCount),
      },
    })
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Unable to import YouTube channel.')
  }
}
