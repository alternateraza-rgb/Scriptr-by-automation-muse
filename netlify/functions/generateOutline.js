import { generateOutline } from './services/scriptGenerationService.mts'
import { success, failure, parseJsonBody } from './utils/response.js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = parseJsonBody(event)

    if (!body.channelContext || !body.selectedIdea?.title || !body.selectedTitle) {
      return failure('Missing required payload for outline generation.', 400)
    }

    const data = await generateOutline({
      context: body.channelContext,
      selectedIdea: body.selectedIdea,
      selectedTitle: body.selectedTitle,
      audience: body.audience,
      tone: body.tone,
      videoLength: body.videoLength,
    })

    return success({
      outline: Array.isArray(data.outline) ? data.outline : [],
    })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Outline generation failed.')
  }
}
