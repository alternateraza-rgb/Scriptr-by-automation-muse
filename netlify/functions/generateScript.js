import { generateFullScript } from './services/scriptGenerationService.mts'
import { success, failure, parseJsonBody } from './utils/response.js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = parseJsonBody(event)

    if (!body.channelContext || !body.selectedIdea?.title || !body.selectedTitle) {
      return failure('Missing required payload for script generation.', 400)
    }

    const data = await generateFullScript({
      context: body.channelContext,
      selectedIdea: body.selectedIdea,
      selectedTitle: body.selectedTitle,
      generatedOutline: Array.isArray(body.generatedOutline) ? body.generatedOutline : Array.isArray(body.selectedOutline) ? body.selectedOutline : [],
      tone: body.tone,
      videoLength: body.videoLength,
    })

    return success({
      script: data?.script || { title: body.selectedTitle, sections: [] },
    })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Script generation failed.')
  }
}
