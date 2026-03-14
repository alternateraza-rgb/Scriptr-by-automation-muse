import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, TitlePayload, VideoIdea } from './types.mts'

const SYSTEM_PROMPT = 'You are a professional YouTube script writer creating high-retention scripts for faceless channels.'

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const titlePrompt = (context: ChannelContext, selectedIdea: VideoIdea) => `Channel profile context:
${JSON.stringify(context, null, 2)}

Selected idea:
${JSON.stringify(selectedIdea, null, 2)}

Task:
Generate exactly 3 YouTube titles optimized for CTR.

Return JSON only in this shape:
{
  "titles": [
    "Title option 1",
    "Title option 2",
    "Title option 3"
  ]
}

Rules:
- Curiosity-driven and concise.
- Strongly aligned with niche and idea.
- Avoid repetitive wording.
- Keep each title under 75 characters.
- No markdown.`

const fallbackTitles = (context: ChannelContext, selectedIdea: VideoIdea) => {
  const topic = asString(selectedIdea.title) || asString(context.videoTopicIdea) || 'This Topic'
  return [
    `${topic}: What Most People Get Wrong`,
    `The Hidden Truth Behind ${topic}`,
    `Before You Try ${topic}, Watch This`,
  ]
}

export const generateTitles = async (context: ChannelContext, selectedIdea: VideoIdea): Promise<TitlePayload> => {
  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: titlePrompt(context, selectedIdea),
    temperature: 0.9,
  })) as Partial<TitlePayload>

  const titles = Array.isArray(output.titles) ? output.titles.filter((title) => typeof title === 'string' && title.trim()) : []
  const safeTitles = [...titles, ...fallbackTitles(context, selectedIdea)].slice(0, 3)

  return { titles: safeTitles }
}
