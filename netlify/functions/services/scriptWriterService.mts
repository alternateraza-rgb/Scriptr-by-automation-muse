import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './types.mts'

type ScriptWriterInput = {
  context: ChannelContext
  selectedIdea: VideoIdea
  selectedHook: string
  selectedTitle: string
  selectedThumbnail: string
  selectedOutline: OutlineSection[]
}

const estimateWordTarget = (videoLength: string) => {
  const matches = videoLength.match(/\d+/g)?.map((value) => Number(value)).filter((value) => !Number.isNaN(value)) || []
  if (!matches.length) {
    return 1400
  }

  const averageMinutes = matches.length >= 2 ? (matches[0] + matches[1]) / 2 : matches[0]
  return Math.max(700, Math.round(averageMinutes * 135))
}

const scriptPrompt = (input: ScriptWriterInput) => `You are Scriptr, a YouTube script writer.
Return JSON only.

Return shape:
{
  "title": "string",
  "thumbnail_text": "string",
  "hook": "string",
  "intro": "string",
  "body_sections": [
    { "heading": "Section 1", "content": "string" },
    { "heading": "Section 2", "content": "string" },
    { "heading": "Section 3", "content": "string" }
  ],
  "cta": "string",
  "conclusion": "string"
}

Rules:
- Script must match requested tone and format.
- Body sections should align to outline sequence.
- Keep flow tight and spoken-word ready for narration.
- Target around ${estimateWordTarget(input.context.videoLength)} words so the narration fits ${input.context.videoLength}.

Generation Input:
${JSON.stringify(input, null, 2)}
`

export const generateFullScript = async (input: ScriptWriterInput): Promise<GeneratedScript> => {
  const output = (await runAiJson(scriptPrompt(input))) as Partial<GeneratedScript>

  if (!output.title || !output.hook || !output.intro || !output.cta || !output.conclusion) {
    throw new Error('Script generation returned incomplete sections.')
  }

  return {
    title: output.title,
    thumbnail_text: output.thumbnail_text || input.selectedThumbnail,
    hook: output.hook,
    intro: output.intro,
    body_sections: Array.isArray(output.body_sections) ? output.body_sections : [],
    cta: output.cta,
    conclusion: output.conclusion,
  }
}
