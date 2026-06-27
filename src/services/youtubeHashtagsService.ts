import { callAiFunction } from './aiProviderService'

export type GenerateYouTubeHashtagsResponse = {
  hashtags: string
}

export async function generateYouTubeHashtags(content: string): Promise<GenerateYouTubeHashtagsResponse> {
  const data = await callAiFunction<GenerateYouTubeHashtagsResponse>('generateYouTubeHashtags', { content })

  if (!data.hashtags?.trim()) {
    throw new Error('Hashtag generation returned an empty result.')
  }

  return { hashtags: data.hashtags.trim() }
}
