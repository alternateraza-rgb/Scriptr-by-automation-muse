import { callAiFunction } from './aiProviderService'

export type GenerateYouTubeDescriptionResponse = {
  description: string
}

export async function generateYouTubeDescription(script: string): Promise<GenerateYouTubeDescriptionResponse> {
  const data = await callAiFunction<GenerateYouTubeDescriptionResponse>('generateYouTubeDescription', { script })

  if (!data.description?.trim()) {
    throw new Error('Description generation returned an empty result.')
  }

  return { description: data.description.trim() }
}
