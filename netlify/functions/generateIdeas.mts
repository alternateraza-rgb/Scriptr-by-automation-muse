import { generateIdeas } from './services/scriptGenerationService.mts'
import { badRequest, parseJson, serverError } from './services/http.mts'
import type { ChannelContext } from './services/types.mts'

type Body = {
  channelContext: ChannelContext
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return badRequest('Method not allowed.')
  }

  try {
    const body = await parseJson<Body>(req)
    if (!body.channelContext?.niche || !body.channelContext?.targetAudience || !body.channelContext?.videoTopicIdea) {
      return badRequest('Missing required channel context fields.')
    }

    const data = await generateIdeas(body.channelContext)
    return Response.json(data)
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Idea generation failed.')
  }
}
