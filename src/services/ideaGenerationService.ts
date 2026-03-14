import { callAiFunction } from './aiProviderService'
import type { ChannelContext, VideoIdea } from './types'

export async function generateIdeas(channelContext: ChannelContext): Promise<{ ideas: VideoIdea[] }> {
  return callAiFunction<{ ideas: VideoIdea[] }>('generateIdeas', { channelContext })
}
