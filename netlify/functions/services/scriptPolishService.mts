import { runAiJson } from './aiProviderService.mts'
import type { ScriptPolishRequest, ScriptPolishResponse } from './types.mts'

const SYSTEM_PROMPT = 'You are a professional YouTube script writer creating high-retention scripts for faceless channels.'

const modePrompt = (mode: ScriptPolishRequest['mode']) => {
  if (mode === 'shorten') return 'Shorten while preserving meaning and pacing.'
  if (mode === 'expand') return 'Expand with useful detail and stronger transitions.'
  if (mode === 'simplify') return 'Simplify language for broad audiences.'
  if (mode === 'intensify') return 'Intensify storytelling with stakes and momentum.'
  return 'Improve retention with tighter pacing and stronger curiosity loops.'
}

const polishPrompt = (input: ScriptPolishRequest) => `Current script:
${input.script}

Polish mode:
${input.mode}

Task:
${modePrompt(input.mode)}

Return JSON only in this shape:
{
  "polished_script": "..."
}

Rules:
- Keep meaning aligned to the original script.
- Return plain text script inside polished_script.
- No markdown.
`

export const polishScript = async (input: ScriptPolishRequest): Promise<ScriptPolishResponse> => {
  const output = (await runAiJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: polishPrompt(input),
    temperature: 0.5,
  })) as Partial<ScriptPolishResponse>

  const polished = typeof output.polished_script === 'string' ? output.polished_script.trim() : ''
  if (!polished) {
    throw new Error('Script polish returned an invalid payload.')
  }

  return { polished_script: polished }
}
