import { callAiFunction } from './aiProviderService'
import type { ChannelContext, OutlineSection, VideoIdea } from './types'

type OutlinePayload = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedHook: string
  selectedTitle: string
  selectedThumbnail: string
  sectionToRegenerate?: string
}

export async function generateOutline(payload: OutlinePayload): Promise<{ outline: OutlineSection[] }> {
  return callAiFunction<{ outline: OutlineSection[] }>('generateOutline', payload)
}
