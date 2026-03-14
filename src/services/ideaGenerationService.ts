import { callAiFunction } from './aiProviderService'
import type { ChannelContext, VideoIdea } from './types'

export async function generateIdeas(channelContext: ChannelContext): Promise<{ ideas: VideoIdea[] }> {
  const data = await callAiFunction<{ ideas?: VideoIdea[] }>('generateIdeas', { channelContext })
  if (!Array.isArray(data.ideas) || data.ideas.length === 0) {
    throw new Error('Idea generation returned no ideas.')
  }
  return { ideas: data.ideas }
}
