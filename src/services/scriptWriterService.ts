import { callAiFunction } from './aiProviderService'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './types'

type ScriptPayload = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedHook: string
  selectedTitle: string
  selectedThumbnail: string
  selectedOutline: OutlineSection[]
}

export async function generateScript(payload: ScriptPayload): Promise<GeneratedScript> {
  return callAiFunction<GeneratedScript>('generateScript', payload)
}
