import { callAiFunction } from './aiProviderService'

export type GenerateYouTubeHashtagsResponse = {
  hashtags: string
}

export async function generateYouTubeHashtags(input: string): Promise<GenerateYouTubeHashtagsResponse> {
  const data = await callAiFunction<GenerateYouTubeHashtagsResponse>('generateYouTubeHashtags', { input })

  if (!data.hashtags?.trim()) {
    throw new Error('Hashtag generation returned an empty result.')
  }

  return { hashtags: data.hashtags.trim() }
}
