import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './types.mts'

type ScriptWriterInput = {
  context: ChannelContext
  selectedIdea: VideoIdea
  selectedTitle: string
  generatedOutline: OutlineSection[]
  tone?: string
  videoLength?: string
}

const SYSTEM_PROMPT = 'You are a professional YouTube script writer creating high-retention scripts for faceless channels.'

const sectionOrder = ['Hook', 'Curiosity Gap', 'Setup', 'Escalation', 'New Information', 'Mid Reset', 'Reveal', 'Payoff', 'CTA']

const estimateWordTarget = (videoLength: string) => {
  const matches = videoLength.match(/\d+/g)?.map((value) => Number(value)).filter((value) => !Number.isNaN(value)) || []
  if (!matches.length) {
    return 1400
  }

  const averageMinutes = matches.length >= 2 ? (matches[0] + matches[1]) / 2 : matches[0]
  return Math.max(700, Math.round(averageMinutes * 135))
}

const scriptPrompt = (input: ScriptWriterInput) => `Channel profile context:
${JSON.stringify(input.context, null, 2)}

Selected idea:
${JSON.stringify(input.selectedIdea, null, 2)}

Selected title:
${input.selectedTitle}

Generated outline:
${JSON.stringify(input.generatedOutline, null, 2)}

Tone override:
${input.tone || input.context.tone || ''}

Video length:
${input.videoLength || input.context.videoLength || ''}

Task:
Generate a complete narration-ready YouTube script that follows the outline sections exactly.
Use short sentences and strong curiosity pacing.

Return JSON only in this exact shape:
{
  "script": {
    "title": "...",
    "sections": [
      { "section": "Hook", "text": "..." },
      { "section": "Curiosity Gap", "text": "..." },
      { "section": "Setup", "text": "..." },
      { "section": "Escalation", "text": "..." },
      { "section": "New Information", "text": "..." },
      { "section": "Mid Reset", "text": "..." },
      { "section": "Reveal", "text": "..." },
      { "section": "Payoff", "text": "..." },
      { "section": "CTA", "text": "..." }
    ]
  }
}

Rules:
- Keep flow tight and narration-friendly.
- Target around ${estimateWordTarget(input.videoLength || input.context.videoLength)} words.
- No markdown.
- Do not add extra sections.
`

const toScriptFromOutline = (input: ScriptWriterInput): GeneratedScript => ({
  script: {
    title: input.selectedTitle,
    sections: sectionOrder.map((section) => ({
      section,
      text:
        input.generatedOutline.find((item) => item.section.toLowerCase() === section.toLowerCase())?.content ||
        `Develop this section for ${input.selectedTitle}.`,
    })),
  },
})

export const generateFullScript = async (input: ScriptWriterInput): Promise<GeneratedScript> => {
  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: scriptPrompt(input),
    temperature: 0.7,
  })) as Partial<GeneratedScript>

  const rawScript = output.script
  if (!rawScript || typeof rawScript !== 'object') {
    return toScriptFromOutline(input)
  }

  const rawSections = Array.isArray(rawScript.sections) ? rawScript.sections : []
  const sectionMap = new Map<string, string>()
  for (const item of rawSections) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const section = typeof item.section === 'string' ? item.section.trim() : ''
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (section && text) {
      sectionMap.set(section.toLowerCase(), text)
    }
  }

  const title = typeof rawScript.title === 'string' && rawScript.title.trim() ? rawScript.title.trim() : input.selectedTitle

  return {
    script: {
      title,
      sections: sectionOrder.map((section) => ({
        section,
        text: sectionMap.get(section.toLowerCase()) || '',
      })),
    },
  }
}
