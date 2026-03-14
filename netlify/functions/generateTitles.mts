import { generateTitles } from './services/scriptGenerationService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, VideoIdea } from './services/types.mts'

type TitlesRequest = {
  channelContext?: ChannelContext
  selectedIdea?: VideoIdea
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = await parseJsonBody<TitlesRequest>(req)

    if (!body.channelContext || !body.selectedIdea?.title) {
      return failure('Missing required payload for title generation.', 400)
    }

    const data = await generateTitles(body.channelContext, body.selectedIdea)

    return success({ titles: Array.isArray(data.titles) ? data.titles.slice(0, 3) : [] })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Title generation failed.')
  }
}
