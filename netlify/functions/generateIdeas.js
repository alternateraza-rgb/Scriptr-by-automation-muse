import { generateIdeas } from './services/scriptGenerationService.mts'
import { success, failure, parseJsonBody } from './utils/response.js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = parseJsonBody(event)
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
