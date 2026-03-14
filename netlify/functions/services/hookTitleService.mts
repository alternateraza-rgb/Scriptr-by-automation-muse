import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, HookTitlePayload, VideoIdea } from './types.mts'

const hookTitlePrompt = (context: ChannelContext, selectedIdea: VideoIdea) => `You are Scriptr, a YouTube packaging specialist.
Generate exactly 3 potential video titles.
Return JSON only.

Return shape:
{
  "titles": ["string"]
}

Rules:
- titles must be under 75 characters.
- Keep all outputs specific to the idea.
- Titles must reflect the video's target runtime (${context.videoLength}).

Channel Context:
${JSON.stringify(context, null, 2)}

Selected Idea:
${JSON.stringify(selectedIdea, null, 2)}
`

export const generateHooksAndTitles = async (
  context: ChannelContext,
  selectedIdea: VideoIdea,
): Promise<HookTitlePayload> => {
  const output = (await runAiJson(hookTitlePrompt(context, selectedIdea))) as Partial<HookTitlePayload>

  const titles = Array.isArray(output.titles) ? output.titles.slice(0, 3) : []

  if (!titles.length) {
    throw new Error('Title generation returned incomplete data.')
  }

  return { titles }
}
