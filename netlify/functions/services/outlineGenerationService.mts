import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, OutlineSection, VideoIdea } from './types.mts'

type OutlineInput = {
  context: ChannelContext
  selectedIdea: VideoIdea
  selectedHook: string
  selectedTitle: string
  selectedThumbnail: string
  sectionToRegenerate?: string
}

const defaultSections = ['Hook', 'Intro', 'Section 1', 'Section 2', 'Section 3', 'Proof / examples', 'CTA placement', 'Conclusion']

const outlinePrompt = ({
  context,
  selectedIdea,
  selectedHook,
  selectedTitle,
  selectedThumbnail,
  sectionToRegenerate,
}: OutlineInput) => `You are Scriptr, a retention-focused YouTube script architect.
Return JSON only.

Return shape:
{
  "outline": [
    { "id": "hook", "title": "Hook", "text": "string" },
    { "id": "intro", "title": "Intro", "text": "string" },
    { "id": "section_1", "title": "Section 1", "text": "string" },
    { "id": "section_2", "title": "Section 2", "text": "string" },
    { "id": "section_3", "title": "Section 3", "text": "string" },
    { "id": "proof_examples", "title": "Proof / examples", "text": "string" },
    { "id": "cta_placement", "title": "CTA placement", "text": "string" },
    { "id": "conclusion", "title": "Conclusion", "text": "string" }
  ]
}

Rules:
- Keep every section concise and actionable.
- Prioritize retention and pacing.
- Build continuity between sections.
${sectionToRegenerate ? `- Strongly improve and rewrite only the "${sectionToRegenerate}" section.` : ''}

Channel Context:
${JSON.stringify(context, null, 2)}

Selections:
${JSON.stringify({ selectedIdea, selectedHook, selectedTitle, selectedThumbnail }, null, 2)}
`

export const generateOutline = async (input: OutlineInput): Promise<{ outline: OutlineSection[] }> => {
  const output = (await runAiJson(outlinePrompt(input))) as { outline?: OutlineSection[] }

  const outline = Array.isArray(output.outline) ? output.outline : []

  if (!outline.length) {
    throw new Error('Outline generation returned no sections.')
  }

  const normalized = outline.map((item, index) => ({
    id: item.id || defaultSections[index]?.toLowerCase().replace(/\s+/g, '_') || `section_${index + 1}`,
    title: item.title || defaultSections[index] || `Section ${index + 1}`,
    text: item.text || '',
    locked: false,
  }))

  return { outline: normalized.slice(0, 8) }
}
