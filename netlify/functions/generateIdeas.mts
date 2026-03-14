import { generateIdeas } from './services/scriptGenerationService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type IdeasRequest = {
  channelContext?: {
    niche?: string
    targetAudience?: string
    audience?: string
    videoTopicIdea?: string
  }
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<IdeasRequest>(req)
    const channelContext = body.channelContext || {}

    if (!channelContext.niche || !(channelContext.targetAudience || channelContext.audience) || !channelContext.videoTopicIdea) {
      return failure('Missing required channel context fields.', 400)
    }

    const data = await generateIdeas(channelContext)
    return success({
      ideas: Array.isArray(data.ideas) ? data.ideas : [],
    })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Idea generation failed.')
  }
}
