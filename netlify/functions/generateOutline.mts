import { generateOutline } from './services/scriptGenerationService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, OutlineSection, VideoIdea } from './services/types.mts'

type OutlineRequest = {
  channelContext?: ChannelContext
  selectedIdea?: VideoIdea
  selectedTitle?: string
  audience?: string
  tone?: string
  videoLength?: string
  selectedOutline?: OutlineSection[]
  generatedOutline?: OutlineSection[]
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = await parseJsonBody<OutlineRequest>(req)

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
