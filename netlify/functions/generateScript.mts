import { generateFullScript } from './services/scriptGenerationService.mts'
import { badRequest, parseJson, serverError } from './services/http.mts'
import type { ChannelContext, OutlineSection, VideoIdea } from './services/types.mts'

type Body = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
  selectedHook: string
  selectedTitle: string
  selectedThumbnail: string
  selectedOutline: OutlineSection[]
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return badRequest('Method not allowed.')
  }

  try {
    const body = await parseJson<Body>(req)
    if (!body.channelContext || !body.selectedIdea?.title || !body.selectedHook || !body.selectedTitle) {
      return badRequest('Missing required payload for script generation.')
    }

    const data = await generateFullScript({
      context: body.channelContext,
      selectedIdea: body.selectedIdea,
      selectedHook: body.selectedHook,
      selectedTitle: body.selectedTitle,
      selectedThumbnail: body.selectedThumbnail,
      selectedOutline: body.selectedOutline,
    })
    return Response.json(data)
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Script generation failed.')
  }
}
