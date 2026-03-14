import { callAiFunction } from './aiProviderService'
import type { ChannelContext, OutlineSection, VideoIdea } from './types'

type OutlinePayload = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedTitle: string
  audience?: string
  tone?: string
  videoLength?: string
}

export async function generateOutline(payload: OutlinePayload): Promise<{ outline: OutlineSection[] }> {
  const data = await callAiFunction<{ outline?: OutlineSection[] }>('generateOutline', payload)
  return { outline: Array.isArray(data.outline) ? data.outline : [] }
}
