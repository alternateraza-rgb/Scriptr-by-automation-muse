import { generateYouTubeDescription } from './services/youtubeDescriptionService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type GenerateYouTubeDescriptionRequest = {
  script?: unknown
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<GenerateYouTubeDescriptionRequest>(req)
    const script = typeof body.script === 'string' ? body.script : ''

    if (!script.trim()) {
      return failure('Please provide a video script.', 400)
    }

    const data = await generateYouTubeDescription({ script })
    return success({ description: data.description })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'YouTube description generation failed.')
  }
}
