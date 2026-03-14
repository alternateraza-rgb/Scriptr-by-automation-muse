import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, OutlineSection, VideoIdea } from './types.mts'

type OutlineInput = {
  context: ChannelContext
  selectedIdea: VideoIdea
  selectedTitle: string
  audience?: string
  tone?: string
  videoLength?: string
}

const SYSTEM_PROMPT = 'You are a professional YouTube script writer creating high-retention scripts for faceless channels.'

const sectionOrder = ['Hook', 'Curiosity Gap', 'Setup', 'Escalation', 'New Information', 'Mid Reset', 'Reveal', 'Payoff', 'CTA']

const normalizeSectionName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

const outlinePrompt = ({ context, selectedIdea, selectedTitle, audience, tone, videoLength }: OutlineInput) => `Channel profile context:
${JSON.stringify(context, null, 2)}

Selected idea:
${JSON.stringify(selectedIdea, null, 2)}

Selected title:
${selectedTitle}

Audience override:
${audience || context.targetAudience || context.audience || ''}

Tone override:
${tone || context.tone || ''}

Video length:
${videoLength || context.videoLength || ''}

Task:
Generate a retention-focused outline with this exact section sequence:
1 Hook
2 Curiosity Gap
3 Setup
4 Escalation
5 New Information
6 Mid-Video Reset
7 Reveal
8 Payoff
9 CTA

Return JSON only in this exact shape:
{
  "outline": [
    { "section": "Hook", "content": "..." },
    { "section": "Curiosity Gap", "content": "..." },
    { "section": "Setup", "content": "..." },
    { "section": "Escalation", "content": "..." },
    { "section": "New Information", "content": "..." },
    { "section": "Mid Reset", "content": "..." },
    { "section": "Reveal", "content": "..." },
    { "section": "Payoff", "content": "..." },
    { "section": "CTA", "content": "..." }
  ]
}

Rules:
- Keep each section concise and narration-friendly.
- Ensure pacing escalates.
- No markdown.`

export const generateOutline = async (input: OutlineInput): Promise<{ outline: OutlineSection[] }> => {
  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: outlinePrompt(input),
    temperature: 0.7,
  })) as { outline?: Partial<OutlineSection>[] }

  const outline = Array.isArray(output.outline) ? output.outline : []
  const indexed = new Map<string, string>()
  for (const item of outline) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const section = typeof item.section === 'string' ? item.section : ''
    const content = typeof item.content === 'string' ? item.content : ''
    if (section && content) {
      indexed.set(normalizeSectionName(section), content.trim())
    }
  }

  const normalized = sectionOrder.map((section) => ({
    section,
    content: indexed.get(normalizeSectionName(section)) || indexed.get(normalizeSectionName(section === 'Mid Reset' ? 'Mid-Video Reset' : section)) || '',
  }))

  return { outline: normalized }
}
