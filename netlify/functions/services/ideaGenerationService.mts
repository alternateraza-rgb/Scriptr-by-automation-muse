import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, VideoIdea } from './types.mts'

const SYSTEM_PROMPT = 'You are a professional YouTube script writer creating high-retention scripts for faceless channels.'

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeClickScore = (value: unknown): 'high' | 'medium' => {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'medium') {
    return 'medium'
  }
  return 'high'
}

const normalizeIdea = (idea: Partial<VideoIdea>): VideoIdea | null => {
  const title = asString(idea.title)
  const concept = asString(idea.concept)
  const whyItWorks = asString(idea.why_it_works)
  const hookAngle = asString(idea.hook_angle)

  if (!title || !concept || !whyItWorks || !hookAngle) {
    return null
  }

  return {
    title,
    concept,
    why_it_works: whyItWorks,
    hook_angle: hookAngle,
    click_score: normalizeClickScore(idea.click_score),
  }
}

const ideasPrompt = (context: ChannelContext) => `Channel profile context:
${JSON.stringify(context, null, 2)}

Task:
Generate exactly 3 strong video ideas aligned to this channel profile.

Must account for:
- niche
- audience
- example channels (when provided)
- channel style and tone
- audience pain points
- user notes

Return JSON only in this shape:
{
  "ideas": [
    {
      "title": "string",
      "concept": "string",
      "why_it_works": "string",
      "hook_angle": "string",
      "click_score": "high"
    }
  ]
}

Rules:
- Return 2 to 3 ideas. Prefer 3 unless the niche is too narrow.
- Keep titles concise and curiosity-driven.
- Set click_score to only "high" or "medium".
- No markdown.`

const fallbackIdeas = (context: ChannelContext): VideoIdea[] => {
  const topic = asString(context.videoTopicIdea) || 'this niche'
  const audience = asString(context.targetAudience) || asString(context.audience) || 'this audience'
  const niche = asString(context.niche) || 'general'

  return [
    {
      title: `The ${niche} Mistake Most People Make With ${topic}`,
      concept: `Break down the single biggest mistake ${audience} makes and how to fix it fast.`,
      why_it_works: 'Targets a common pain point and promises a specific, practical correction.',
      hook_angle: 'Call out a costly mistake immediately, then promise a fix.',
      click_score: 'high',
    },
    {
      title: `What Happens If You Ignore This ${topic} Trend`,
      concept: `Explain a shift happening now and what it means for ${audience}.`,
      why_it_works: 'Uses urgency and consequence framing to increase watch intent.',
      hook_angle: 'Start with a surprising consequence and delay the explanation.',
      click_score: 'medium',
    },
  ]
}

export const generateIdeas = async (context: ChannelContext): Promise<{ ideas: VideoIdea[] }> => {
  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: ideasPrompt(context),
    temperature: 0.9,
  })) as { ideas?: Partial<VideoIdea>[] }

  const ideas = Array.isArray(output.ideas) ? output.ideas.map(normalizeIdea).filter(Boolean) as VideoIdea[] : []
  const safeIdeas = (ideas.length ? ideas : fallbackIdeas(context)).slice(0, 3)

  return {
    ideas: safeIdeas,
  }
}
