import { callAiFunction } from './aiProviderService'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './types'

type ScriptPayload = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedTitle: string
  generatedOutline: OutlineSection[]
  tone?: string
  videoLength?: string
}

export async function generateScript(payload: ScriptPayload): Promise<GeneratedScript> {
  const data = await callAiFunction<Partial<GeneratedScript>>('generateScript', payload)
  if (!data || typeof data !== 'object' || !data.script) {
    throw new Error('Script generation returned incomplete data.')
  }

  return {
    script: {
      title: data.script.title || payload.selectedTitle,
      sections: Array.isArray(data.script.sections) ? data.script.sections : [],
    },
  }
}
