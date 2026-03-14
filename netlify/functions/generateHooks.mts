import { generateHooksAndTitles } from './services/scriptGenerationService.mts'
import { badRequest, parseJson, serverError } from './services/http.mts'
import type { ChannelContext, VideoIdea } from './services/types.mts'

type Body = {
  channelContext: ChannelContext
  selectedIdea: VideoIdea
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return badRequest('Method not allowed.')
  }

  try {
    const body = await parseJson<Body>(req)
    if (!body.channelContext || !body.selectedIdea?.title) {
      return badRequest('Missing required payload for hooks generation.')
    }

    const data = await generateHooksAndTitles(body.channelContext, body.selectedIdea)
    return Response.json(data)
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Hook generation failed.')
  }
}
