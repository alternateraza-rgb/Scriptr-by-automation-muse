import { supabase } from '../../lib/supabase'

export type ScriptGenerationJobRow = {
  id: string
  user_id: string
  status: 'queued' | 'generating' | 'completed' | 'failed'
  request_payload: unknown
  result: unknown
  created_at: string
}

const countWords = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length

export const parseVideoLengthMinutes = (videoLength: string): number | null => {
  const values =
    videoLength
      .match(/\d+/g)
      ?.map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0) ?? []

  if (!values.length) {
    return null
  }

  if (values.length === 1) {
    return values[0]
  }

  return Math.round(((values[0] + values[1]) / 2) * 10) / 10
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null

export const extractJobDurationMinutes = (job: ScriptGenerationJobRow): number | null => {
  const payload = asRecord(job.request_payload)
  const context = asRecord(payload?.context)

  const videoLength =
    (typeof payload?.videoLength === 'string' ? payload.videoLength : null) ||
    (typeof context?.videoLength === 'string' ? context.videoLength : null)

  if (videoLength) {
    return parseVideoLengthMinutes(videoLength)
  }

  const result = asRecord(job.result)
  const script = asRecord(result?.script)
  const sections = Array.isArray(script?.sections) ? script.sections : []

  const words = sections.reduce((total, section) => {
    const row = asRecord(section)
    return total + countWords(typeof row?.text === 'string' ? row.text : '')
  }, 0)

  if (words > 0) {
    return Math.round((words / 135) * 10) / 10
  }

  return null
}

export const extractJobTopic = (job: ScriptGenerationJobRow): string | null => {
  const payload = asRecord(job.request_payload)
  if (!payload) {
    return null
  }

  const context = asRecord(payload.context)
  const selectedIdea = asRecord(payload.selectedIdea)

  const candidates = [
    payload.topic,
    payload.category,
    context?.videoTopicIdea,
    context?.niche,
    selectedIdea?.title,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()

const getWeekBucketsForCurrentMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const buckets: Array<{ week: string; start: Date; end: Date }> = []
  let weekStart = new Date(firstDay)
  let weekIndex = 1

  while (weekStart <= lastDay && weekIndex <= 4) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const end = weekEnd > lastDay ? lastDay : weekEnd
    buckets.push({
      week: `W${weekIndex}`,
      start: startOfDay(weekStart),
      end: startOfDay(end),
    })
    weekStart = new Date(weekStart)
    weekStart.setDate(weekStart.getDate() + 7)
    weekIndex += 1
  }

  return buckets
}

const isWithinRange = (value: Date, start: Date, end: Date) => {
  const timestamp = startOfDay(value).getTime()
  return timestamp >= start.getTime() && timestamp <= end.getTime()
}

export const fetchScriptGenerationJobsForUser = async (userId: string) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('script_generation_jobs')
    .select('id, user_id, status, request_payload, result, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })
    .returns<ScriptGenerationJobRow[]>()

  if (error) {
    console.error('[dashboardStats:fetchScriptGenerationJobsForUser] fetch error', { userId, error })
    throw error
  }

  return data ?? []
}

export type AggregatedDashboardData = {
  totalScriptsThisMonth: number
  averageDurationMinutes: number
  activeProjects: number
  weeklyProduction: Array<{ week: string; scripts: number }>
  durationTrends: Array<{ date: string; avgMinutes: number }>
  topicDistribution: Array<{ topic: string; count: number; percentage: number }>
  isEmpty: boolean
}

export const aggregateDashboardStats = (jobs: ScriptGenerationJobRow[]): AggregatedDashboardData => {
  const now = new Date()
  const completedJobs = jobs.filter((job) => job.status === 'completed')
  const completedThisMonth = completedJobs.filter((job) => isSameMonth(new Date(job.created_at), now))
  const activeProjects = jobs.filter((job) => job.status === 'queued' || job.status === 'generating').length

  const durations = completedJobs
    .map((job) => extractJobDurationMinutes(job))
    .filter((value): value is number => value !== null)

  const averageDurationMinutes =
    durations.length > 0
      ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
      : 0

  const weeklyBuckets = getWeekBucketsForCurrentMonth()
  const weeklyProduction = weeklyBuckets.map((bucket) => ({
    week: bucket.week,
    scripts: completedJobs.filter((job) => {
      const createdAt = new Date(job.created_at)
      return isSameMonth(createdAt, now) && isWithinRange(createdAt, bucket.start, bucket.end)
    }).length,
  }))

  const durationTrends: Array<{ date: string; avgMinutes: number }> = []
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date(now)
    day.setDate(day.getDate() - offset)
    const dayStart = startOfDay(day)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayJobs = completedJobs.filter((job) => {
      const createdAt = new Date(job.created_at)
      return createdAt >= dayStart && createdAt < dayEnd
    })

    const dayDurations = dayJobs
      .map((job) => extractJobDurationMinutes(job))
      .filter((value): value is number => value !== null)

    if (dayDurations.length > 0) {
      const avgMinutes =
        Math.round((dayDurations.reduce((sum, value) => sum + value, 0) / dayDurations.length) * 10) / 10
      durationTrends.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgMinutes,
      })
    }
  }

  const topicCounts = new Map<string, number>()
  for (const job of completedThisMonth) {
    const topic = extractJobTopic(job)
    if (!topic) {
      continue
    }
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
  }

  const sortedTopics = [...topicCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4)
  const topicTotal = sortedTopics.reduce((sum, [, count]) => sum + count, 0)
  const topicDistribution = sortedTopics.map(([topic, count]) => ({
    topic,
    count,
    percentage: topicTotal > 0 ? Math.round((count / topicTotal) * 100) : 0,
  }))

  return {
    totalScriptsThisMonth: completedThisMonth.length,
    averageDurationMinutes,
    activeProjects,
    weeklyProduction,
    durationTrends,
    topicDistribution,
    isEmpty: completedJobs.length === 0,
  }
}
