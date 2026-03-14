import { callAiFunction } from './aiProviderService'
import type { ChannelContext, TitlePayload, VideoIdea } from './types'

export async function generateTitles(channelContext: ChannelContext, selectedIdea: VideoIdea): Promise<TitlePayload> {
  const data = await callAiFunction<{ titles?: string[] }>('generateTitles', { channelContext, selectedIdea })
  if (!Array.isArray(data.titles) || data.titles.length === 0) {
    throw new Error('Title generation returned no titles.')
  }
  return {
    titles: data.titles.filter((title) => typeof title === 'string' && title.trim()).slice(0, 3),
  }
}
