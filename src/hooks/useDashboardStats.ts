import { useMemo } from 'react'

export type WeeklyProductionPoint = {
  week: string
  scripts: number
}

export type DurationTrendPoint = {
  date: string
  avgMinutes: number
}

export type TopicDistributionItem = {
  topic: string
  count: number
  percentage: number
}

export type DashboardKpis = {
  totalScripts: number
  averageDurationMinutes: number
  activeProjects: number
}

export type DashboardStats = {
  kpis: DashboardKpis
  weeklyProduction: WeeklyProductionPoint[]
  durationTrends: DurationTrendPoint[]
  topicDistribution: TopicDistributionItem[]
  isLoading: boolean
}

const TOPIC_COLORS = ['#ff3347', '#e11d2e', '#ff6b7a', '#c41e2e']

function getWeeksInCurrentMonth(): WeeklyProductionPoint[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const weeks: WeeklyProductionPoint[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let weekStart = new Date(firstDay)
  let weekIndex = 1

  while (weekStart <= lastDay) {
    weeks.push({
      week: `W${weekIndex}`,
      scripts: [4, 7, 5, 9, 6, 11, 8, 3][weekIndex - 1] ?? 5,
    })
    weekStart = new Date(weekStart)
    weekStart.setDate(weekStart.getDate() + 7)
    weekIndex += 1
  }

  return weeks.slice(0, 4)
}

function getDurationTrends(): DurationTrendPoint[] {
  const points: DurationTrendPoint[] = []
  const today = new Date()

  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const wave = Math.sin(i / 4.5) * 2.2
    const trend = (29 - i) * 0.04
    points.push({
      date: label,
      avgMinutes: Number((8.5 + wave + trend).toFixed(1)),
    })
  }

  return points
}

/**
 * Mock dashboard statistics hook.
 * Replace the mock generators with Supabase queries when real data is available.
 */
export function useDashboardStats(): DashboardStats {
  return useMemo(
    () => ({
      kpis: {
        totalScripts: 47,
        averageDurationMinutes: 11.4,
        activeProjects: 6,
      },
      weeklyProduction: getWeeksInCurrentMonth(),
      durationTrends: getDurationTrends(),
      topicDistribution: [
        { topic: 'Productivity', count: 14, percentage: 32 },
        { topic: 'Tech Reviews', count: 11, percentage: 25 },
        { topic: 'Creator Tips', count: 9, percentage: 21 },
        { topic: 'Storytelling', count: 6, percentage: 14 },
      ],
      isLoading: false,
    }),
    [],
  )
}

export { TOPIC_COLORS }
