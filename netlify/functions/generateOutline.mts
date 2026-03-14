import { generateOutline } from './services/scriptGenerationService.mts'
import { badRequest, parseJson, serverError } from './services/http.mts'
import type { ChannelContext, VideoIdea } from './services/types.mts'

type Body = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedHook: string
  selectedTitle: string
  selectedThumbnail: string
  sectionToRegenerate?: string
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return badRequest('Method not allowed.')
  }

  try {
    const body = await parseJson<Body>(req)
    if (!body.channelContext || !body.selectedIdea?.title || !body.selectedHook || !body.selectedTitle) {
      return badRequest('Missing required payload for outline generation.')
    }

    const data = await generateOutline({
      context: body.channelContext,
      selectedIdea: body.selectedIdea,
      selectedHook: body.selectedHook,
      selectedTitle: body.selectedTitle,
      selectedThumbnail: body.selectedThumbnail,
      sectionToRegenerate: body.sectionToRegenerate,
    })
    return Response.json(data)
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Outline generation failed.')
  }
}
