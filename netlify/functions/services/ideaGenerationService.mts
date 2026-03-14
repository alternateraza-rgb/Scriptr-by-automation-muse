import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, VideoIdea } from './types.mts'

const ideasPrompt = (context: ChannelContext) => `You are Scriptr, a YouTube strategist for faceless channels.
Generate exactly 3 strong video ideas and return JSON only.

Return shape:
{
  "ideas": [
    {
      "title": "string",
      "concept": "string",
      "why_it_works": "string",
      "hook_angle": "string",
      "thumbnail_text": "string",
      "click_score": 0
    }
  ]
}

Rules:
- Prioritize quality over quantity.
- click_score is an integer from 1 to 10.
- Avoid generic topics.
- Keep title under 75 characters.
- Anchor each idea to the requested video topic when provided.

Channel Context:
${JSON.stringify(context, null, 2)}
`

export const generateIdeas = async (context: ChannelContext): Promise<{ ideas: VideoIdea[] }> => {
  const output = (await runAiJson(ideasPrompt(context))) as { ideas?: VideoIdea[] }

  const ideas = Array.isArray(output.ideas) ? output.ideas.slice(0, 3) : []

  if (!ideas.length) {
    throw new Error('No ideas were generated.')
  }

  return {
    ideas: ideas.map((idea) => ({
      ...idea,
      click_score: Math.max(1, Math.min(10, Number(idea.click_score) || 7)),
    })),
  }
}
