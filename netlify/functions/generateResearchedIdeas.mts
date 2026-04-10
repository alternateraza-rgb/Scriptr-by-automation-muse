import { runAiJson } from './services/aiProviderService.mts'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './services/types.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type ChannelProfileContext = {
  channelName?: string
  exampleChannels?: string[]
  userNotes?: string
}

type IdeasRequest = Partial<ChannelContext> & {
  channelProfile?: string | ChannelProfileContext
  channelProfileText?: string
  channelContext?: Partial<ChannelContext> & {
    channelProfile?: string | ChannelProfileContext
  }
}

type YouTubeSearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } }
  }
}

type YouTubeVideoDetailsItem = {
  id?: string
  snippet?: {
    publishedAt?: string
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
  contentDetails?: {
    duration?: string
  }
}

type NormalizedContext = {
  niche: string
  videoTopicIdea: string
  targetAudience: string
  tone: string
  videoLength: string
  videoFormat: string
  exampleChannels: string[]
  userNotes: string
  channelStyle: string
  audiencePainPoints: string
  channelName: string
  channelStage: string
  channelProfile: string
}

type OutlierStatus = 'Low' | 'Medium' | 'High'

type ClickScore = 'low' | 'medium' | 'high'

type OutlierSignals = {
  relevance: number
  packaging: number
  novelty: number
  recency: number
  performance: number
  total: number
}

type ResearchVideo = {
  videoId: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  duration: string
  viewsPerDay: number
  outlierSignals: OutlierSignals
  outlierStatus: OutlierStatus
}

type IdeaInspirationVideo = {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  publishedAt: string
  views: number
  likes: number
  comments: number
  estimatedRevenue: number
  videoUrl: string
  viralLiftDate: string
  angleLabel: string
}

type ResearchInsights = {
  sampleSize: number
  whatIsWorking: string[]
  overusedPatterns: string[]
  angleGaps: string[]
  outperformingVideoTypes: string[]
  titlePatterns: string[]
  contentAngles: string[]
  topicClusters: string[]
  saturationSignals: string[]
  opportunityGaps: string[]
}

type CachedResearchEntry = {
  cacheKey: string
  createdAt: number
  videos: ResearchVideo[]
  insights: ResearchInsights
  compactSummary: string
}

type IdeasPayload = {
  ideas: VideoIdea[]
}

type TitlesPayload = {
  titles: string[]
}

type OutlinePayload = {
  outline: OutlineSection[]
}

const ADVANCED_SYSTEM_PROMPT = `PROMPT_LOCK_VERSION: SCRIPTRR_V3_OUTLIER_ENGINE

You are a top-tier YouTube strategist and script writer for faceless channels.

You create high-retention, non-generic content based on real performance patterns.

You do not brainstorm randomly.
You analyze what works, avoid saturation, and generate strategic content ideas.

You write in a cinematic, engaging, narration-first style.
You avoid all generic AI phrasing and clichés.

You follow structure exactly.
You return valid JSON only.`

const REQUIRED_SECTIONS = ['Hook', 'Curiosity Gap', 'Setup', 'Escalation', 'New Information', 'Mid Reset', 'Reveal', 'Payoff', 'CTA']
const RANKED_OUTLIER_ORDER: OutlierStatus[] = ['High', 'Medium', 'Low']
const RANKED_CLICK_ORDER: ClickScore[] = ['high', 'medium', 'low']
const FETCH_TIMEOUT_MS = 8000
const RESEARCH_WINDOW_YEARS = 3
const SEARCH_RESULTS_PER_QUERY = 10
const MAX_RESEARCH_RESULTS = 12
const RESEARCH_CACHE_TTL_MS = 30 * 60 * 1000
const RESEARCH_CACHE_MAX_ENTRIES = 250

const PLACEHOLDER_SNIPPETS = ['audience profile not set yet', 'add inspiration channels', 'add inspiration videos']

const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'from',
  'that',
  'this',
  'your',
  'about',
  'into',
  'after',
  'before',
  'video',
  'videos',
  'story',
  'stories',
  'channel',
  'explained',
  'documentary',
  'how',
  'why',
  'what',
  'when',
])

const BANNED_PHRASES = [
  'What if I told you',
  'In this video',
  "Let's dive in",
  'History is full of',
  'The answer lies in',
  'Since the beginning of time',
  'This shows that',
]

const BANNED_TITLE_STARTS = ['what if', 'in this video', 'the truth about', 'everything you need to know']
const RESEARCH_CACHE = new Map<string, CachedResearchEntry>()

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const asArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const YOUTUBE_VIDEO_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'])

const getYouTubeVideoId = (value: string) => {
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return ''
    }

    const hostname = parsed.hostname.toLowerCase()
    if (!YOUTUBE_VIDEO_HOSTS.has(hostname)) {
      return ''
    }

    if (hostname.includes('youtu.be')) {
      return parsed.pathname.split('/').filter(Boolean)[0] || ''
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean)
    if (pathParts[0] === 'shorts') {
      return ''
    }

    if (pathParts[0] === 'embed' || pathParts[0] === 'live') {
      return pathParts[1] || ''
    }

    return parsed.searchParams.get('v')?.trim() || ''
  } catch {
    return ''
  }
}

const isAllowedYouTubeVideoUrl = (value: string) => !/\/shorts\//i.test(value) && Boolean(getYouTubeVideoId(value))

const toIsoDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const parsePositiveInt = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
  }
  if (typeof value !== 'string') {
    return 0
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const getDaysSincePublished = (publishedAt: string) => {
  const publishedDate = new Date(publishedAt)
  if (Number.isNaN(publishedDate.getTime())) {
    return 1
  }
  const elapsed = Date.now() - publishedDate.getTime()
  return Math.max(1, Math.round(elapsed / (1000 * 60 * 60 * 24)))
}

const calculateViralLiftDate = (publishedAt: string, viewsPerDay: number) => {
  const publishedDate = new Date(publishedAt)
  if (Number.isNaN(publishedDate.getTime())) {
    return ''
  }

  const daysToLift =
    viewsPerDay >= 35000 ? 2 : viewsPerDay >= 18000 ? 4 : viewsPerDay >= 9000 ? 7 : viewsPerDay >= 4000 ? 11 : 15

  const candidate = new Date(publishedDate.getTime() + daysToLift * 24 * 60 * 60 * 1000)
  const now = new Date()
  return new Date(Math.min(now.getTime(), candidate.getTime())).toISOString()
}

const calculateEstimatedRevenue = (views: number, likes: number, comments: number) => {
  if (views <= 0) {
    return 0
  }

  const likeRate = likes / views
  const commentRate = comments / views
  const engagementBoost = Math.min(2.8, likeRate * 22 + commentRate * 90)
  const estimatedRpm = Math.min(10, Math.max(2.25, 2.25 + engagementBoost))
  return Math.round((views / 1000) * estimatedRpm)
}

const parseVideoLengthMinutes = (videoLength: string) => {
  const values = videoLength
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0) || []

  if (!values.length) {
    return 11
  }

  if (values.length === 1) {
    return values[0]
  }

  return Math.round((values[0] + values[1]) / 2)
}

const buildLengthTargets = (videoLength: string) => {
  const minutes = parseVideoLengthMinutes(videoLength)
  const targetWords = Math.max(750, minutes * 135)
  const minimumWords = Math.max(650, Math.round(targetWords * 0.9))
  const maximumWords = Math.round(targetWords * 1.1)
  return { minutes, targetWords, minimumWords, maximumWords }
}

const countWords = (value: string) => value.split(/\s+/).map((part) => part.trim()).filter(Boolean).length

const countScriptWords = (script: GeneratedScript) => script.script.sections.reduce((total, section) => total + countWords(section.text), 0)

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

const sanitizeTextOutput = (value: string) => {
  let sanitized = decodeHtmlEntities(value)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u2014\u2013]/g, ' - ')

  for (const phrase of BANNED_PHRASES) {
    const pattern = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    sanitized = sanitized.replace(pattern, '')
  }

  return normalizeWhitespace(sanitized)
}

const sanitizeTitleOutput = (value: string) =>
  sanitizeTextOutput(value)
    .replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, '')
    .replace(/^\s*(?:\d+[\).:\]-]\s*|[-*•]+\s*)/g, '')

const normalizeOutlierStatus = (value: unknown): OutlierStatus => {
  const normalized = asString(value).toLowerCase()
  if (normalized === 'high') {
    return 'High'
  }
  if (normalized === 'low') {
    return 'Low'
  }
  return 'Medium'
}

const normalizeClickScore = (value: unknown): ClickScore => {
  const normalized = asString(value).toLowerCase()
  if (normalized === 'low') {
    return 'low'
  }
  if (normalized === 'medium') {
    return 'medium'
  }
  return 'high'
}

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)

const getEnv = (name: string): string | undefined => {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get: (key: string) => string | undefined } } }).Netlify?.env
  return netlifyEnv?.get(name) || process.env[name]
}

const hasPlaceholder = (value: string) => {
  const normalized = value.toLowerCase()
  return PLACEHOLDER_SNIPPETS.some((snippet) => normalized.includes(snippet))
}

const withDefault = (value: string, fallback: string) => {
  if (!value || hasPlaceholder(value)) {
    return fallback
  }
  return value
}

const toOutlierStatus = (score: number): OutlierStatus => {
  if (score >= 70) {
    return 'High'
  }
  if (score >= 45) {
    return 'Medium'
  }
  return 'Low'
}

const normalizeIdea = (idea: Partial<VideoIdea>): VideoIdea | null => {
  const title = sanitizeTitleOutput(asString(idea.title))
  const concept = sanitizeTextOutput(asString(idea.concept))
  const whyItWorks = sanitizeTextOutput(asString(idea.why_it_works))
  const hookAngle = sanitizeTextOutput(asString(idea.hook_angle))

  if (!title || !concept || !whyItWorks || !hookAngle) {
    return null
  }

  return {
    title,
    concept,
    why_it_works: whyItWorks,
    hook_angle: hookAngle,
    click_score: normalizeClickScore(idea.click_score),
    outlierStatus: normalizeOutlierStatus((idea as { outlierStatus?: unknown }).outlierStatus),
  }
}

const normalizeContext = (body: IdeasRequest): NormalizedContext => {
  const source = body.channelContext && typeof body.channelContext === 'object' ? body.channelContext : body
  const rawChannelProfile = source.channelProfile ?? body.channelProfile
  const channelProfileObject = typeof rawChannelProfile === 'object' && rawChannelProfile !== null ? rawChannelProfile : {}

  const niche = withDefault(asString((source as { niche?: unknown }).niche), 'Education')
  const videoTopicIdea = withDefault(
    asString((source as { videoTopicIdea?: unknown }).videoTopicIdea),
    `Underrated ${niche.toLowerCase()} stories with modern relevance`,
  )
  const targetAudience = withDefault(
    asString((source as { targetAudience?: unknown }).targetAudience || (source as { audience?: unknown }).audience),
    `Curious viewers who want useful and surprising ${niche.toLowerCase()} insights without fluff.`,
  )
  const exampleChannelsRaw = asArray(
    (source as { exampleChannels?: unknown }).exampleChannels || (channelProfileObject as { exampleChannels?: unknown }).exampleChannels,
  )

  const exampleChannels =
    exampleChannelsRaw.length && !exampleChannelsRaw.some((channel) => hasPlaceholder(channel))
      ? exampleChannelsRaw.filter((channel) => isAllowedYouTubeVideoUrl(channel))
      : []

  const userNotes = withDefault(
    asString((source as { userNotes?: unknown }).userNotes || (channelProfileObject as { userNotes?: unknown }).userNotes),
    'Prioritize watch-time retention, clear story arcs, and monetizable evergreen topics.',
  )

  const profileString = withDefault(
    asString(
      typeof rawChannelProfile === 'string'
        ? rawChannelProfile
        : body.channelProfileText ||
            (source as { channelProfile?: unknown }).channelProfile ||
            (channelProfileObject as { channelName?: unknown }).channelName,
    ),
    `Faceless channel focused on ${niche.toLowerCase()} with cinematic narration and practical depth.`,
  )

  return {
    niche,
    videoTopicIdea,
    targetAudience,
    tone: withDefault(asString((source as { tone?: unknown }).tone), 'Conversational'),
    videoLength: withDefault(asString((source as { videoLength?: unknown }).videoLength), '10-12 minutes'),
    videoFormat: withDefault(asString((source as { videoFormat?: unknown }).videoFormat), 'Long-form faceless videos'),
    exampleChannels,
    userNotes,
    channelStyle: withDefault(asString((source as { channelStyle?: unknown }).channelStyle), 'Narration-first faceless storytelling'),
    audiencePainPoints: withDefault(
      asString((source as { audiencePainPoints?: unknown }).audiencePainPoints),
      `Viewers struggle to find ${niche.toLowerCase()} content that is both engaging and actionable.`,
    ),
    channelName: withDefault(asString((source as { channelName?: unknown }).channelName), `${niche} Signal`),
    channelStage: withDefault(asString((source as { channelStage?: unknown }).channelStage), 'Early stage channel building authority.'),
    channelProfile: profileString,
  }
}

const normalizeCachePart = (value: string) =>
  normalizeWhitespace(value.toLowerCase())
    .replace(/[^\w\s|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const buildResearchCacheKey = (context: NormalizedContext) => {
  const segments = [context.niche, context.videoTopicIdea, context.targetAudience, context.videoFormat]
    .map((part) => normalizeCachePart(part))
    .filter((part) => part && !hasPlaceholder(part))

  return segments.join('|') || 'general|ideas|broad audience|long-form'
}

type SearchPlan = {
  query: string
  order: 'relevance' | 'viewCount'
  publishedAfter?: string
}

const buildSearchPlans = (context: NormalizedContext): SearchPlan[] => {
  const recentPublishedAfter = new Date(Date.now() - RESEARCH_WINDOW_YEARS * 365 * 24 * 60 * 60 * 1000).toISOString()
  const candidateQueries = [
    normalizeWhitespace(`${context.niche} ${context.videoTopicIdea} ${context.targetAudience} ${context.videoFormat}`),
    normalizeWhitespace(`${context.niche} ${context.videoTopicIdea} documentary`),
    normalizeWhitespace(`${context.videoTopicIdea} ${context.niche}`),
    normalizeWhitespace(`${context.videoTopicIdea}`),
  ].filter(Boolean)

  const uniqueQueries = [...new Set(candidateQueries)]
  return uniqueQueries.slice(0, 4).map((query, index) => ({
    query,
    order: index < 2 ? 'relevance' : 'viewCount',
    publishedAfter: index === 0 ? recentPublishedAfter : undefined,
  }))
}

const cleanupResearchCache = () => {
  const now = Date.now()
  for (const [key, entry] of RESEARCH_CACHE.entries()) {
    if (now - entry.createdAt > RESEARCH_CACHE_TTL_MS) {
      RESEARCH_CACHE.delete(key)
    }
  }
}

const tokenSetFromKey = (value: string) => new Set(value.split('|').flatMap((part) => tokenize(part)))

const getKeySimilarity = (left: string, right: string) => {
  const leftTokens = tokenSetFromKey(left)
  const rightTokens = tokenSetFromKey(right)
  if (!leftTokens.size || !rightTokens.size) {
    return 0
  }

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1
    }
  }
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union > 0 ? overlap / union : 0
}

const getCachedResearch = (cacheKey: string) => {
  cleanupResearchCache()
  const exact = RESEARCH_CACHE.get(cacheKey)
  if (exact) {
    return exact
  }

  let best: CachedResearchEntry | null = null
  let bestScore = 0
  for (const entry of RESEARCH_CACHE.values()) {
    const score = getKeySimilarity(cacheKey, entry.cacheKey)
    if (score >= 0.93 && score > bestScore) {
      best = entry
      bestScore = score
    }
  }

  return best
}

const setCachedResearch = (entry: CachedResearchEntry) => {
  RESEARCH_CACHE.set(entry.cacheKey, entry)
  if (RESEARCH_CACHE.size <= RESEARCH_CACHE_MAX_ENTRIES) {
    return
  }

  const oldest = [...RESEARCH_CACHE.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0]
  if (oldest) {
    RESEARCH_CACHE.delete(oldest[0])
  }
}

const getTitlePackagingScore = (title: string) => {
  const lower = title.toLowerCase()
  let score = 0

  if (/\d/.test(lower)) {
    score += 4
  }
  if (/[?!]/.test(lower)) {
    score += 3
  }
  if (/\b(hidden|inside|mistake|secrets?|untold|before|after|vs|truth|exposed|revealed|forbidden)\b/.test(lower)) {
    score += 9
  }
  if (/\b(how|why)\b/.test(lower)) {
    score += 4
  }

  return Math.min(20, score)
}

const getRelevanceScore = (context: NormalizedContext, title: string, description: string) => {
  const targetTerms = new Set(tokenize(`${context.niche} ${context.videoTopicIdea} ${context.targetAudience}`))
  if (!targetTerms.size) {
    return 0
  }

  const bag = `${title} ${description}`.toLowerCase()
  let matched = 0
  for (const term of targetTerms) {
    if (bag.includes(term)) {
      matched += 1
    }
  }

  return Math.min(30, Math.round((matched / targetTerms.size) * 30))
}

const getNoveltyScore = (title: string, frequentTerms: Set<string>) => {
  const words = tokenize(title)
  if (!words.length) {
    return 0
  }

  let uniqueTerms = 0
  for (const word of words) {
    if (!frequentTerms.has(word)) {
      uniqueTerms += 1
    }
  }

  return Math.min(20, Math.round((uniqueTerms / words.length) * 20))
}

const getRecencyScore = (publishedAt: string) => {
  if (!publishedAt) {
    return 2
  }

  const timestamp = new Date(publishedAt).getTime()
  if (!Number.isFinite(timestamp)) {
    return 2
  }

  const days = Math.max(1, (Date.now() - timestamp) / (1000 * 60 * 60 * 24))
  if (days <= 30) {
    return 15
  }
  if (days <= 180) {
    return 11
  }
  if (days <= 365) {
    return 7
  }
  return 3
}

const findContentAngle = (title: string, description: string) => {
  const bag = `${title} ${description}`.toLowerCase()
  if (/\b(case study|breakdown|analysis)\b/.test(bag)) {
    return 'Case-study breakdown'
  }
  if (/\b(mistake|wrong|avoid|warning)\b/.test(bag)) {
    return 'Mistake and warning framing'
  }
  if (/\b(hidden|untold|secret|forgotten|unknown)\b/.test(bag)) {
    return 'Hidden-story reveal'
  }
  if (/\b(step|guide|framework|how to)\b/.test(bag)) {
    return 'Actionable framework'
  }
  if (/\b(vs|versus|compared|battle)\b/.test(bag)) {
    return 'Comparison conflict'
  }
  return 'Narrative explainer'
}

const countTerms = (titles: string[]) => {
  const counts = new Map<string, number>()
  for (const title of titles) {
    const unique = new Set(tokenize(title))
    for (const term of unique) {
      if (STOP_WORDS.has(term)) {
        continue
      }
      counts.set(term, (counts.get(term) || 0) + 1)
    }
  }
  return counts
}

const topTerms = (counts: Map<string, number>, limit: number) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, frequency]) => `${term} (${frequency})`)

const analyzeResearch = (context: NormalizedContext, videos: ResearchVideo[]): ResearchInsights => {
  const titles = videos.map((video) => video.title)
  const angleCounts = new Map<string, number>()

  for (const video of videos) {
    const angle = findContentAngle(video.title, video.description)
    angleCounts.set(angle, (angleCounts.get(angle) || 0) + 1)
  }

  const termCounts = countTerms(titles)
  const titlePatterns = topTerms(termCounts, 8)
  const contentAngles = [...angleCounts.entries()].sort((a, b) => b[1] - a[1]).map(([angle, count]) => `${angle} (${count})`)
  const topicClusters = topTerms(termCounts, 6)

  const highOutliers = videos.filter((video) => video.outlierStatus === 'High')
  const mediumOutliers = videos.filter((video) => video.outlierStatus === 'Medium')

  const overusedPatterns = contentAngles.slice(0, 2).map((item) => `Saturated angle: ${item}`)
  const saturationSignals = [
    `Repeated title terms: ${titlePatterns.slice(0, 4).join(', ') || 'not enough data'}`,
    `Outlier distribution: High ${highOutliers.length}, Medium ${mediumOutliers.length}, Low ${videos.length - highOutliers.length - mediumOutliers.length}`,
  ]

  const exampleChannelMentions = context.exampleChannels
    .map((channel) => {
      const channelHits = videos.filter((video) => video.channelTitle.toLowerCase().includes(channel.toLowerCase()))
      return channelHits.length ? `${channel} themes appeared ${channelHits.length} times` : ''
    })
    .filter(Boolean)

  const opportunityGaps = [
    `Underused angle: ${contentAngles[3] || 'Deep narrative with practical payoff'}`,
    `Missing audience fit: few videos directly target ${context.targetAudience.toLowerCase()}`,
    `Format gap: combine ${context.videoFormat.toLowerCase()} style with stronger story tension and proof moments`,
  ]

  const whatIsWorking = [
    'Videos with clear conflict in the title outperform neutral explainers.',
    'High-performing uploads stack curiosity and specific payoff in one line.',
    `Recent videos with stronger pacing cues are beating older evergreen uploads in ${context.niche.toLowerCase()}.`,
  ]

  const outperformingVideoTypes = [
    contentAngles[0] || 'Hidden-story reveal',
    contentAngles[1] || 'Case-study breakdown',
    'Narrative explainers with measurable stakes',
  ]

  const angleGaps = [
    ...opportunityGaps,
    ...exampleChannelMentions,
  ].slice(0, 4)

  return {
    sampleSize: videos.length,
    whatIsWorking,
    overusedPatterns,
    angleGaps,
    outperformingVideoTypes,
    titlePatterns,
    contentAngles,
    topicClusters,
    saturationSignals,
    opportunityGaps,
  }
}

const fetchJsonWithTimeout = async <T>(url: URL): Promise<T> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      const details = await response.text()
      throw new Error(`YouTube request failed (${response.status}): ${details || 'no details'}`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

const fetchYouTubeResearch = async (
  context: NormalizedContext,
  apiKey: string,
): Promise<{ videos: ResearchVideo[]; youtubeRequestCount: number }> => {
  const merged = new Map<
    string,
    Omit<ResearchVideo, 'views' | 'likes' | 'comments' | 'duration' | 'viewsPerDay' | 'outlierSignals' | 'outlierStatus'>
  >()
  let youtubeRequestCount = 0
  let lastSearchError: Error | null = null

  for (const plan of buildSearchPlans(context)) {
    if (merged.size >= MAX_RESEARCH_RESULTS) {
      break
    }

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('order', plan.order)
    searchUrl.searchParams.set('maxResults', String(SEARCH_RESULTS_PER_QUERY))
    if (plan.publishedAfter) {
      searchUrl.searchParams.set('publishedAfter', plan.publishedAfter)
    }
    searchUrl.searchParams.set(
      'fields',
      'items(id(videoId),snippet(title,description,channelTitle,publishedAt,thumbnails(default(url),medium(url),high(url))))',
    )
    searchUrl.searchParams.set('q', plan.query)
    searchUrl.searchParams.set('key', apiKey)

    try {
      const searchJson = await fetchJsonWithTimeout<{ items?: YouTubeSearchItem[] }>(searchUrl)
      youtubeRequestCount += 1
      const items = Array.isArray(searchJson.items) ? searchJson.items : []

      for (const item of items) {
        const videoId = asString(item.id?.videoId)
        if (!videoId || merged.has(videoId)) {
          continue
        }

        const snippet = item.snippet || {}
        const thumbnail = asString(
          snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
        )

        merged.set(videoId, {
          videoId,
          title: asString(snippet.title),
          description: asString(snippet.description),
          channelTitle: asString(snippet.channelTitle),
          publishedAt: toIsoDate(snippet.publishedAt),
          thumbnail,
        })
      }
    } catch (error) {
      lastSearchError = error instanceof Error ? error : new Error('YouTube search failed.')
      continue
    }
  }

  const baseVideos = [...merged.values()].slice(0, MAX_RESEARCH_RESULTS)
  if (!baseVideos.length) {
    if (lastSearchError) {
      throw lastSearchError
    }
    throw new Error('YouTube research returned no matching videos.')
  }

  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  detailsUrl.searchParams.set('part', 'snippet,statistics,contentDetails')
  detailsUrl.searchParams.set('id', baseVideos.map((video) => video.videoId).join(','))
  detailsUrl.searchParams.set(
    'fields',
    'items(id,snippet(publishedAt),statistics(viewCount,likeCount,commentCount),contentDetails(duration))',
  )
  detailsUrl.searchParams.set('key', apiKey)

  const detailsJson = await fetchJsonWithTimeout<{ items?: YouTubeVideoDetailsItem[] }>(detailsUrl)
  youtubeRequestCount += 1
  const detailsItems = Array.isArray(detailsJson.items) ? detailsJson.items : []
  const detailsById = new Map<string, YouTubeVideoDetailsItem>()
  for (const item of detailsItems) {
    const id = asString(item.id)
    if (id) {
      detailsById.set(id, item)
    }
  }

  const enrichedVideos = baseVideos.map((video) => {
    const details = detailsById.get(video.videoId)
    const views = parsePositiveInt(details?.statistics?.viewCount)
    const likes = parsePositiveInt(details?.statistics?.likeCount)
    const comments = parsePositiveInt(details?.statistics?.commentCount)
    const publishedAt = toIsoDate(details?.snippet?.publishedAt) || video.publishedAt
    const daysSincePublished = getDaysSincePublished(publishedAt)
    const viewsPerDay = views > 0 ? Math.round(views / daysSincePublished) : 0

    return {
      ...video,
      publishedAt,
      views,
      likes,
      comments,
      duration: asString(details?.contentDetails?.duration),
      viewsPerDay,
    }
  })

  const maxViewsPerDay = Math.max(...enrichedVideos.map((video) => video.viewsPerDay), 1)
  const titleTermCounts = countTerms(baseVideos.map((video) => video.title))
  const frequentTerms = new Set([...titleTermCounts.entries()].filter(([, count]) => count >= 3).map(([term]) => term))

  const scored = enrichedVideos.map((video) => {
    const relevance = getRelevanceScore(context, video.title, video.description)
    const packaging = getTitlePackagingScore(video.title)
    const novelty = getNoveltyScore(video.title, frequentTerms)
    const recency = getRecencyScore(video.publishedAt)
    const performance = Math.max(0, Math.min(22, Math.round((video.viewsPerDay / maxViewsPerDay) * 22)))
    const total = Math.max(0, Math.min(100, Math.round(relevance + packaging + novelty + recency)))
    const finalTotal = Math.max(0, Math.min(100, total + performance))

    return {
      ...video,
      outlierSignals: {
        relevance,
        packaging,
        novelty,
        recency,
        performance,
        total: finalTotal,
      },
      outlierStatus: toOutlierStatus(finalTotal),
    }
  })

  return {
    videos: scored.sort((a, b) => b.outlierSignals.total - a.outlierSignals.total).slice(0, MAX_RESEARCH_RESULTS),
    youtubeRequestCount,
  }
}

const buildCompactResearchSummary = (context: NormalizedContext, insights: ResearchInsights, videos: ResearchVideo[]) => {
  const exampleTitles = videos.slice(0, 5).map((video) => video.title)
  const summary = {
    sampleSize: insights.sampleSize,
    titlePatterns: insights.titlePatterns.slice(0, 5),
    repeatedAngles: insights.contentAngles.slice(0, 4),
    saturationPatterns: insights.saturationSignals.slice(0, 2),
    strongestOutlierSignals: insights.whatIsWorking.slice(0, 3),
    opportunityGaps: insights.opportunityGaps.slice(0, 3),
    topExampleTitles: exampleTitles,
    audienceTarget: context.targetAudience,
    formatTarget: context.videoFormat,
  }
  return JSON.stringify(summary, null, 2)
}

const buildFallbackInsights = (context: NormalizedContext): ResearchInsights => ({
  sampleSize: 0,
  whatIsWorking: [
    `Narrative tension and specific payoff are still strong patterns in ${context.niche.toLowerCase()}.`,
    `A direct fit to ${context.targetAudience.toLowerCase()} can outperform broad generic positioning.`,
    `Clear framing around ${context.videoFormat.toLowerCase()} helps differentiate commoditized topics.`,
  ],
  overusedPatterns: ['Generic broad explainers without a strong conflict hook.'],
  angleGaps: [
    `Audience-specific framing for ${context.targetAudience.toLowerCase()}.`,
    'Stronger proof moments tied to concrete outcomes.',
    `A sharper narrative arc aligned to ${context.videoLength}.`,
  ],
  outperformingVideoTypes: ['Hidden-story reveal', 'Case-study breakdown', 'Narrative explainer'],
  titlePatterns: ['specific outcomes', 'curiosity + consequence', 'clear conflict framing'],
  contentAngles: ['Narrative explainer', 'Case-study breakdown'],
  topicClusters: tokenize(`${context.niche} ${context.videoTopicIdea}`).slice(0, 6),
  saturationSignals: ['No fresh YouTube sample available; avoid generic phrasing.'],
  opportunityGaps: [`Underused format blend: ${context.videoFormat} + practical proof + story tension.`],
})

const buildIdeasPrompt = (context: NormalizedContext, compactSummary: string) => {

  return `User variables:\n${JSON.stringify(context, null, 2)}

Processed YouTube research summary:\n${compactSummary}

Strict generation instructions:
- Generate EXACTLY 3 ideas.
- Each idea must include: title, concept, why_it_works, hook_angle, click_score, outlierStatus.
- click_score must be one of: low, medium, high.
- outlierStatus must be one of: Low, Medium, High.
- Idea 1 must be High/high, Idea 2 must be Medium/medium, Idea 3 must be Low/low.
- why_it_works must reference the provided research signals.
- No generic topics, no repeated angles, no textbook phrasing.
- Keep the three ideas strategically distinct.
- Hard requirement: weave in these variables directly: niche, targetAudience, videoLength, videoFormat, audiencePainPoints.

Return valid JSON only with this shape:
{
  "ideas": [
    {
      "title": "...",
      "concept": "...",
      "why_it_works": "...",
      "hook_angle": "...",
      "click_score": "high",
      "outlierStatus": "High"
    }
  ]
}`
}

const fallbackIdeas = (context: NormalizedContext, videos: ResearchVideo[] = []): VideoIdea[] => {
  const topChannels = videos.slice(0, 3).map((video) => video.channelTitle).filter(Boolean)

  return [0, 1, 2].map((index) => ({
    title:
      index === 0
        ? `The ${context.niche} Pattern Everyone Missed in ${context.videoTopicIdea}`
        : index === 1
          ? `Inside the Quiet Shift Reshaping ${context.videoTopicIdea}`
          : `Why ${context.targetAudience} Keep Missing This ${context.niche} Signal`,
    concept: `Build a ${context.videoFormat.toLowerCase()} story around ${
      topChannels[index] ? `patterns seen on ${topChannels[index]}` : 'current audience demand signals'
    }, then pivot to an underused insight tailored to ${context.targetAudience}.`,
    why_it_works: 'This framing pairs clear conflict with audience-fit specificity, which improves click intent and retention potential.',
    hook_angle: index === 0 ? 'Open with a belief the audience trusts, then break it with hard evidence.' : index === 1 ? 'Start with a dramatic consequence, then reveal the hidden driver.' : 'Use a two-part mystery that escalates before the midpoint.',
    click_score: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
    outlierStatus: index === 0 ? 'High' : index === 1 ? 'Medium' : 'Low',
  }))
}

const rankIdeas = (ideas: VideoIdea[]): VideoIdea[] =>
  [...ideas]
    .sort((a, b) => {
      const statusWeight: Record<OutlierStatus, number> = { High: 3, Medium: 2, Low: 1 }
      const clickWeight: Record<ClickScore, number> = { high: 3, medium: 2, low: 1 }
      const statusDiff = statusWeight[normalizeOutlierStatus(b.outlierStatus)] - statusWeight[normalizeOutlierStatus(a.outlierStatus)]
      if (statusDiff !== 0) {
        return statusDiff
      }
      return clickWeight[normalizeClickScore(b.click_score)] - clickWeight[normalizeClickScore(a.click_score)]
    })
    .slice(0, 3)
    .map((idea, index) => ({
      ...idea,
      outlierStatus: RANKED_OUTLIER_ORDER[index] || 'Low',
      click_score: RANKED_CLICK_ORDER[index] || 'low',
    }))

const selectIdea = (ideas: VideoIdea[]) => {
  const statusWeight: Record<OutlierStatus, number> = { High: 3, Medium: 2, Low: 1 }
  const clickWeight: Record<ClickScore, number> = { high: 3, medium: 2, low: 1 }

  return [...ideas].sort((a, b) => {
    const statusDiff = statusWeight[normalizeOutlierStatus(b.outlierStatus)] - statusWeight[normalizeOutlierStatus(a.outlierStatus)]
    if (statusDiff !== 0) {
      return statusDiff
    }
    return clickWeight[normalizeClickScore(b.click_score)] - clickWeight[normalizeClickScore(a.click_score)]
  })[0]
}

const toIdeaInspirationVideo = (video: ResearchVideo): IdeaInspirationVideo => ({
  videoId: video.videoId,
  title: sanitizeTitleOutput(video.title),
  channelTitle: sanitizeTextOutput(video.channelTitle),
  thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
  publishedAt: video.publishedAt,
  views: video.views,
  likes: video.likes,
  comments: video.comments,
  estimatedRevenue: calculateEstimatedRevenue(video.views, video.likes, video.comments),
  videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
  viralLiftDate: calculateViralLiftDate(video.publishedAt, video.viewsPerDay),
  angleLabel: findContentAngle(video.title, video.description),
})

const attachInspirationVideosToIdeas = (ideas: VideoIdea[], videos: ResearchVideo[]): VideoIdea[] => {
  if (!videos.length) {
    return ideas
  }

  const usageByVideoId = new Map<string, number>()
  const primaryVideoIds = new Set<string>()
  const MAX_VIDEOS_PER_IDEA = 3

  return ideas.map((idea) => {
    const ideaTokens = new Set(tokenize(`${idea.title} ${idea.concept} ${idea.hook_angle}`))
    const ranked = [...videos].sort((a, b) => {
      const aTokens = tokenize(`${a.title} ${a.description}`)
      const bTokens = tokenize(`${b.title} ${b.description}`)
      const aOverlap = aTokens.filter((token) => ideaTokens.has(token)).length
      const bOverlap = bTokens.filter((token) => ideaTokens.has(token)).length

      const aUsagePenalty = (usageByVideoId.get(a.videoId) || 0) * 8
      const bUsagePenalty = (usageByVideoId.get(b.videoId) || 0) * 8
      const aScore = aOverlap * 18 + a.outlierSignals.total * 0.7 + Math.min(30, a.viewsPerDay / 1200) - aUsagePenalty
      const bScore = bOverlap * 18 + b.outlierSignals.total * 0.7 + Math.min(30, b.viewsPerDay / 1200) - bUsagePenalty

      return bScore - aScore
    })

    const primaryCandidate = ranked.find((candidate) => !primaryVideoIds.has(candidate.videoId)) || ranked[0]
    if (!primaryCandidate) {
      return idea
    }

    const selectedVideos: ResearchVideo[] = [primaryCandidate]
    const usedVideoIds = new Set([primaryCandidate.videoId])
    const usedAngles = new Set([findContentAngle(primaryCandidate.title, primaryCandidate.description)])

    for (const candidate of ranked) {
      if (selectedVideos.length >= MAX_VIDEOS_PER_IDEA) {
        break
      }
      if (usedVideoIds.has(candidate.videoId)) {
        continue
      }
      const angle = findContentAngle(candidate.title, candidate.description)
      if (usedAngles.has(angle)) {
        continue
      }
      selectedVideos.push(candidate)
      usedVideoIds.add(candidate.videoId)
      usedAngles.add(angle)
    }

    if (selectedVideos.length < MAX_VIDEOS_PER_IDEA) {
      for (const candidate of ranked) {
        if (selectedVideos.length >= MAX_VIDEOS_PER_IDEA) {
          break
        }
        if (usedVideoIds.has(candidate.videoId)) {
          continue
        }
        selectedVideos.push(candidate)
        usedVideoIds.add(candidate.videoId)
      }
    }

    for (const candidate of selectedVideos) {
      usageByVideoId.set(candidate.videoId, (usageByVideoId.get(candidate.videoId) || 0) + 1)
    }
    primaryVideoIds.add(primaryCandidate.videoId)

    const normalizedVideos = selectedVideos.map(toIdeaInspirationVideo)
    return {
      ...idea,
      inspirationVideos: normalizedVideos,
      inspirationVideo: normalizedVideos[0],
    }
  })
}

const buildScriptCorrectionPrompt = (
  context: NormalizedContext,
  selectedTitle: string,
  script: GeneratedScript,
  minimumWords: number,
  maximumWords: number,
  targetWords: number,
) => `User variables:\n${JSON.stringify(context, null, 2)}

Selected title:\n${selectedTitle}

Current draft script:\n${JSON.stringify(script, null, 2)}

Strict rewrite instructions:
- Keep the same section order and JSON shape.
- Preserve the storyline and evidence quality.
- Rewrite for a final word count between ${minimumWords} and ${maximumWords} words.
- Target close to ${targetWords} words.
- Do not use em dashes.
- Keep tone and audience fit exactly aligned with the variables.

Return valid JSON only in this exact format:
{
  "script": {
    "title": "...",
    "sections": [
      { "section": "Hook", "text": "..." },
      { "section": "Curiosity Gap", "text": "..." },
      { "section": "Setup", "text": "..." },
      { "section": "Escalation", "text": "..." },
      { "section": "New Information", "text": "..." },
      { "section": "Mid Reset", "text": "..." },
      { "section": "Reveal", "text": "..." },
      { "section": "Payoff", "text": "..." },
      { "section": "CTA", "text": "..." }
    ]
  }
}`

const buildTitlesPrompt = (context: NormalizedContext, selectedIdea: VideoIdea, insights: ResearchInsights) => `User variables:\n${JSON.stringify(context, null, 2)}

Selected idea:\n${JSON.stringify(selectedIdea, null, 2)}

Processed YouTube research summary:\n${JSON.stringify(insights, null, 2)}

Strict generation instructions:
- Generate EXACTLY 3 titles for the selected idea.
- High curiosity, strong promise, clean phrasing.
- Avoid these starts: What if, In this video, The truth about, Everything you need to know.
- Keep titles distinct and clickable.
- Every title must stay aligned to targetAudience and audiencePainPoints.

Return valid JSON only with this shape:
{
  "titles": ["...", "...", "..."]
}`

const normalizeTitles = (titles: unknown, selectedIdea: VideoIdea): string[] => {
  const input = Array.isArray(titles) ? titles : []
  const safe = input
    .filter((title): title is string => typeof title === 'string')
    .map((title) => sanitizeTitleOutput(title))
    .filter((title) => {
      const lower = title.toLowerCase()
      return title && !BANNED_TITLE_STARTS.some((start) => lower.startsWith(start))
    })

  const deduped = [...new Set(safe)]
  if (deduped.length >= 3) {
    return deduped.slice(0, 3)
  }

  const base = sanitizeTitleOutput(selectedIdea.title)
  const fallback = [
    `${base}: The Hidden Leverage Point`,
    `The Shift Behind ${base}`,
    `${base} and the Pattern Nobody Tracks`,
  ]

  return [...deduped, ...fallback].slice(0, 3)
}

const buildOutlinePrompt = (
  context: NormalizedContext,
  selectedIdea: VideoIdea,
  selectedTitle: string,
  insights: ResearchInsights,
) => `User variables:\n${JSON.stringify(context, null, 2)}

Selected idea:\n${JSON.stringify(selectedIdea, null, 2)}

Selected title:\n${selectedTitle}

Processed YouTube research summary:\n${JSON.stringify(insights, null, 2)}

Strict generation instructions:
- Generate an outline with EXACT sections in this order:
1. Hook
2. Curiosity Gap
3. Setup
4. Escalation
5. New Information
6. Mid Reset
7. Reveal
8. Payoff
9. CTA
- Each section must be intentional, high-retention, and lead naturally to the next.
- Bake in the user variables (tone, targetAudience, audiencePainPoints, videoFormat, channelStyle).

Return valid JSON only with this shape:
{
  "outline": [
    { "section": "Hook", "content": "..." },
    { "section": "Curiosity Gap", "content": "..." },
    { "section": "Setup", "content": "..." },
    { "section": "Escalation", "content": "..." },
    { "section": "New Information", "content": "..." },
    { "section": "Mid Reset", "content": "..." },
    { "section": "Reveal", "content": "..." },
    { "section": "Payoff", "content": "..." },
    { "section": "CTA", "content": "..." }
  ]
}`

const normalizeSectionName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

const normalizeOutline = (outline: unknown): OutlineSection[] => {
  const items = Array.isArray(outline) ? outline : []
  const indexed = new Map<string, string>()

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const rawSection = asString((item as { section?: unknown }).section)
    const rawContent = sanitizeTextOutput(asString((item as { content?: unknown }).content))
    if (!rawSection || !rawContent) {
      continue
    }

    indexed.set(normalizeSectionName(rawSection), rawContent)
  }

  return REQUIRED_SECTIONS.map((section) => ({
    section,
    content: indexed.get(normalizeSectionName(section)) || '',
  }))
}

const buildScriptPrompt = (
  context: NormalizedContext,
  selectedIdea: VideoIdea,
  selectedTitle: string,
  outline: OutlineSection[],
  insights: ResearchInsights,
) => {
  const lengthTargets = buildLengthTargets(context.videoLength)
  return `User variables:\n${JSON.stringify(context, null, 2)}

Selected idea:\n${JSON.stringify(selectedIdea, null, 2)}

Selected title:\n${selectedTitle}

Master outline:\n${JSON.stringify(outline, null, 2)}

Processed YouTube research summary:\n${JSON.stringify(insights, null, 2)}

Strict generation instructions:
- Produce a cinematic, spoken, high-retention script with natural pacing.
- Respect tone: ${context.tone}.
- Respect videoLength: ${context.videoLength}.
- Use channelStyle: ${context.channelStyle}.
- Keep the script strongly focused on audiencePainPoints: ${context.audiencePainPoints}.
- The script must land near ${lengthTargets.minutes} minutes.
- Word count must be between ${lengthTargets.minimumWords} and ${lengthTargets.maximumWords}. Target ${lengthTargets.targetWords} words.
- Keep consistency across idea, title, outline, and script.
- NO em dashes.
- NO generic phrasing.
- NO filler.
- NO repetition.
- Never use these phrases: ${BANNED_PHRASES.join('; ')}.

Return valid JSON only in this exact format:
{
  "script": {
    "title": "...",
    "sections": [
      { "section": "Hook", "text": "..." },
      { "section": "Curiosity Gap", "text": "..." },
      { "section": "Setup", "text": "..." },
      { "section": "Escalation", "text": "..." },
      { "section": "New Information", "text": "..." },
      { "section": "Mid Reset", "text": "..." },
      { "section": "Reveal", "text": "..." },
      { "section": "Payoff", "text": "..." },
      { "section": "CTA", "text": "..." }
    ]
  }
}`
}

const normalizeScript = (raw: unknown, selectedTitle: string, outline: OutlineSection[]): GeneratedScript => {
  const fallback = {
    script: {
      title: selectedTitle,
      sections: REQUIRED_SECTIONS.map((section) => ({
        section,
        text:
          outline.find((item) => normalizeSectionName(item.section) === normalizeSectionName(section))?.content ||
          `Develop this section for ${selectedTitle}.`,
      })),
    },
  }

  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const script = (raw as { script?: unknown }).script
  if (!script || typeof script !== 'object') {
    return fallback
  }

  const title = sanitizeTitleOutput(asString((script as { title?: unknown }).title)) || sanitizeTitleOutput(selectedTitle)
  const sections = Array.isArray((script as { sections?: unknown[] }).sections) ? (script as { sections: unknown[] }).sections : []

  const indexed = new Map<string, string>()
  for (const sectionEntry of sections) {
    if (!sectionEntry || typeof sectionEntry !== 'object') {
      continue
    }

    const sectionName = normalizeSectionName(asString((sectionEntry as { section?: unknown }).section))
    const sectionText = sanitizeTextOutput(asString((sectionEntry as { text?: unknown }).text))
    if (sectionName && sectionText) {
      indexed.set(sectionName, sectionText)
    }
  }

  return {
    script: {
      title,
      sections: REQUIRED_SECTIONS.map((section) => ({
        section,
        text:
          indexed.get(normalizeSectionName(section)) ||
          outline.find((item) => normalizeSectionName(item.section) === normalizeSectionName(section))?.content ||
          '',
      })),
    },
  }
}

const generateIdeasWithAi = async (context: NormalizedContext, compactSummary: string, videos: ResearchVideo[]) => {
  const output = (await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt: buildIdeasPrompt(context, compactSummary),
    temperature: 0.7,
  })) as Partial<IdeasPayload>

  const aiIdeas = Array.isArray(output.ideas) ? output.ideas.map(normalizeIdea).filter((idea): idea is VideoIdea => Boolean(idea)) : []
  const deduped = [...new Map(aiIdeas.map((idea) => [idea.title.toLowerCase(), idea])).values()].slice(0, 3)
  const ranked = rankIdeas(deduped.length === 3 ? deduped : fallbackIdeas(context, videos))
  return ranked
}

const generateTitlesWithAi = async (
  context: NormalizedContext,
  selectedIdea: VideoIdea,
  insights: ResearchInsights,
): Promise<string[]> => {
  const output = (await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt: buildTitlesPrompt(context, selectedIdea, insights),
    temperature: 0.8,
  })) as Partial<TitlesPayload>

  return normalizeTitles(output.titles, selectedIdea)
}

const generateOutlineWithAi = async (
  context: NormalizedContext,
  selectedIdea: VideoIdea,
  selectedTitle: string,
  insights: ResearchInsights,
): Promise<OutlineSection[]> => {
  const output = (await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt: buildOutlinePrompt(context, selectedIdea, selectedTitle, insights),
    temperature: 0.7,
  })) as Partial<OutlinePayload>

  return normalizeOutline(output.outline)
}

const generateScriptWithAi = async (
  context: NormalizedContext,
  selectedIdea: VideoIdea,
  selectedTitle: string,
  outline: OutlineSection[],
  insights: ResearchInsights,
): Promise<GeneratedScript> => {
  const targets = buildLengthTargets(context.videoLength)
  const output = await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt: buildScriptPrompt(context, selectedIdea, selectedTitle, outline, insights),
    temperature: 0.7,
  })

  const normalized = normalizeScript(output, selectedTitle, outline)
  const wordCount = countScriptWords(normalized)
  if (wordCount >= targets.minimumWords && wordCount <= targets.maximumWords) {
    return normalized
  }

  const correction = await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt: buildScriptCorrectionPrompt(
      context,
      selectedTitle,
      normalized,
      targets.minimumWords,
      targets.maximumWords,
      targets.targetWords,
    ),
    temperature: 0.6,
  })

  return normalizeScript(correction, selectedTitle, outline)
}

const isQuotaRelatedError = (message: string) =>
  /quota|dailylimitexceeded|ratelimitexceeded|userRateLimitExceeded|403/i.test(message)

export default async (req: Request) => {
  const startedAt = Date.now()
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<IdeasRequest>(req)
    const context = normalizeContext(body)
    const cacheKey = buildResearchCacheKey(context)
    console.log('[generateResearchedIdeas] normalized query', { cacheKey })

    const youtubeApiKey = getEnv('YOUTUBE_API_KEY')
    const openAiKey = getEnv('OPENAI_API_KEY')
    if (!openAiKey) {
      return failure('OPENAI_API_KEY is not configured.', 500)
    }

    let youtubeRequestCount = 0
    let fallbackMode = false
    let reusedCachedResearch = false
    let compactSummary = ''
    let researchVideos: ResearchVideo[] = []
    let insights: ResearchInsights = buildFallbackInsights(context)

    const cached = getCachedResearch(cacheKey)
    if (cached) {
      reusedCachedResearch = true
      researchVideos = cached.videos
      insights = cached.insights
      compactSummary = cached.compactSummary
      console.log('[generateResearchedIdeas] cache hit', {
        cacheKey,
        sampleSize: cached.videos.length,
        cacheAgeMinutes: Math.round((Date.now() - cached.createdAt) / 60000),
      })
    } else {
      console.log('[generateResearchedIdeas] cache miss', { cacheKey })
      if (!youtubeApiKey) {
        fallbackMode = true
        console.warn('[generateResearchedIdeas] YOUTUBE_API_KEY missing, using fallback mode')
      } else {
        try {
          const youtubeResearch = await fetchYouTubeResearch(context, youtubeApiKey)
          youtubeRequestCount += youtubeResearch.youtubeRequestCount
          researchVideos = youtubeResearch.videos
          insights = analyzeResearch(context, researchVideos)
          compactSummary = buildCompactResearchSummary(context, insights, researchVideos)
          setCachedResearch({
            cacheKey,
            createdAt: Date.now(),
            videos: researchVideos,
            insights,
            compactSummary,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'YouTube research failed.'
          fallbackMode = true
          if (isQuotaRelatedError(message)) {
            console.warn('[generateResearchedIdeas] YouTube quota-related error', { cacheKey, message })
          } else {
            console.warn('[generateResearchedIdeas] YouTube error, using fallback mode', { cacheKey, message })
          }
        }
      }
    }

    if (!compactSummary) {
      compactSummary = buildCompactResearchSummary(context, insights, researchVideos)
    }

    console.log('[generateResearchedIdeas] research usage', {
      cacheKey,
      youtubeRequestCount,
      reusedCachedResearch,
      fallbackMode,
      sampleSize: researchVideos.length,
    })

    let ideas: VideoIdea[]
    try {
      ideas = await generateIdeasWithAi(context, compactSummary, researchVideos)
    } catch {
      ideas = fallbackIdeas(context, researchVideos)
    }

    if (ideas.length !== 3) {
      ideas = [...ideas, ...fallbackIdeas(context, researchVideos)].slice(0, 3)
    }
    ideas = rankIdeas(ideas)
    ideas = attachInspirationVideosToIdeas(ideas, researchVideos)

    const selectedIdea = selectIdea(ideas)
    const lightweightTitles = normalizeTitles([], selectedIdea)

    console.log('[generateResearchedIdeas] completed', {
      cacheKey,
      durationMs: Date.now() - startedAt,
      youtubeRequestCount,
      reusedCachedResearch,
      fallbackMode,
      ideasCount: ideas.length,
    })

    return success({
      ideas: ideas.slice(0, 3),
      titles: lightweightTitles.slice(0, 3),
      outline: [],
      script: null,
    })
  } catch (err) {
    console.warn('[generateResearchedIdeas] failed', {
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : 'AI generation pipeline failed.',
    })
    return failure(err instanceof Error ? err.message : 'AI generation pipeline failed.')
  }
}
