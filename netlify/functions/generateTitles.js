import { generateTitles } from './services/scriptGenerationService.mts'
import { success, failure, parseJsonBody } from './utils/response.js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = parseJsonBody(event)

    if (!body.channelContext || !body.selectedIdea?.title) {
      return failure('Missing required payload for title generation.', 400)
    }

    const data = await generateTitles(body.channelContext, body.selectedIdea)

    return success({ titles: Array.isArray(data.titles) ? data.titles.slice(0, 3) : [] })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Title generation failed.')
  }
}
