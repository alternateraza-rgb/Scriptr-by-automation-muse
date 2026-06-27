import { generateYouTubeHashtags } from './services/youtubeHashtagsService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type GenerateYouTubeHashtagsRequest = {
  content?: unknown
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<GenerateYouTubeHashtagsRequest>(req)
    const content = typeof body.content === 'string' ? body.content : ''

    if (!content.trim()) {
      return failure('Please provide a video script, topic, or description.', 400)
    }

    const data = await generateYouTubeHashtags({ content })
    return success({ hashtags: data.hashtags })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'YouTube hashtag generation failed.')
  }
}
