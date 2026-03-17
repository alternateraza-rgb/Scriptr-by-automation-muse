import { callAiFunction } from './aiProviderService'
import type { ChannelContext, VideoIdea } from './types'

const splitTextList = (value: string | undefined): string[] =>
  (value || '')
    .split(/[\n,|]/g)
    .map((item) => item.trim())
    .filter(Boolean)

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
    monetizationGoal: channelContext.monetizationGoal,
    channelStage: channelContext.channelStage,
    channelProfileText: profileText,
    channelProfile: {
      channelName: channelContext.channelName,
      contentPillars: splitTextList(profileText),
      exampleChannels: channelContext.exampleChannels || [],
      userNotes: channelContext.userNotes,
    },
    channelContext,
  }

  const data = await callAiFunction<{ ideas?: VideoIdea[] }>('generateIdeas', payload)

  if (!Array.isArray(data.ideas) || data.ideas.length === 0) {
    throw new Error('Idea generation returned no ideas.')
  }

  const ideas = data.ideas.slice(0, 3).map((idea) => ({
    ...idea,
    click_score: normalizeClickScore(idea?.click_score),
    outlierStatus: normalizeOutlierStatus(idea?.outlierStatus),
  }))

  return { ideas }
}
