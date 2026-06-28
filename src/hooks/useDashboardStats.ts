import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  aggregateDashboardStats,
  fetchScriptGenerationJobsForUser,
  type AggregatedDashboardData,
} from '../services/data/dashboardStatsService'

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
  isEmpty: boolean
}

const EMPTY_STATS: AggregatedDashboardData = {
  totalScriptsThisMonth: 0,
  averageDurationMinutes: 0,
  activeProjects: 0,
  weeklyProduction: [],
  durationTrends: [],
  topicDistribution: [],
  isEmpty: true,
}

const TOPIC_COLORS = ['#ff3347', '#e11d2e', '#ff6b7a', '#c41e2e']

const toDashboardStats = (data: AggregatedDashboardData, isLoading: boolean): DashboardStats => ({
  kpis: {
    totalScripts: data.totalScriptsThisMonth,
    averageDurationMinutes: data.averageDurationMinutes,
    activeProjects: data.activeProjects,
  },
  weeklyProduction: data.weeklyProduction,
  durationTrends: data.durationTrends,
  topicDistribution: data.topicDistribution,
  isLoading,
  isEmpty: data.isEmpty,
})

/**
 * Loads dashboard statistics for the authenticated user from Supabase.
 */
export function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<AggregatedDashboardData>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(true)

  const loadStats = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[useDashboardStats] auth error', authError)
      setStats(EMPTY_STATS)
      setIsLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setStats(EMPTY_STATS)
      setIsLoading(false)
      return
    }

    try {
      const jobs = await fetchScriptGenerationJobsForUser(userId)
      setStats(aggregateDashboardStats(jobs))
    } catch (error) {
      console.error('[useDashboardStats] fetch error', error)
      setStats(EMPTY_STATS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const initialize = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id

      if (!isMounted) {
        return
      }

      await loadStats()

      if (!userId || !isMounted) {
        return
      }

      channel = supabase
        .channel(`dashboard-stats-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'script_generation_jobs',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadStats({ silent: true })
          },
        )
        .subscribe()
    }

    void initialize()

    return () => {
      isMounted = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [loadStats])

  return toDashboardStats(stats, isLoading)
}

export { TOPIC_COLORS }
