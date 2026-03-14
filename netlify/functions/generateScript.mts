import { generateFullScript } from './services/scriptGenerationService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, OutlineSection, VideoIdea } from './services/types.mts'

type ScriptRequest = {
  channelContext?: ChannelContext
  selectedIdea?: VideoIdea
  selectedTitle?: string
  generatedOutline?: OutlineSection[]
  selectedOutline?: OutlineSection[]
  tone?: string
  videoLength?: string
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = await parseJsonBody<ScriptRequest>(req)

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
