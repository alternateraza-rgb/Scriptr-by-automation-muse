import { runAiJson } from './aiProviderService.mts'
import type { GeneratedScript, ScriptPolishRequest, ScriptPolishResponse } from './types.mts'

const polishPrompt = (input: ScriptPolishRequest) => `You are Scriptr, a collaborative script editor.
Apply the user's command to improve or amend the script.
Return JSON only.

Return shape:
{
  "assistant_reply": "string",
  "script": {
    "title": "string",
    "thumbnail_text": "string",
    "hook": "string",
    "intro": "string",
    "body_sections": [
      { "heading": "string", "content": "string" }
    ],
    "cta": "string",
    "conclusion": "string"
  }
}

Rules:
- Keep the script aligned with the same niche, topic, and audience intent.
- Preserve valid JSON.
- Keep assistant_reply short and specific to what was changed.

User command:
${input.command}

Current script:
${JSON.stringify(input.script, null, 2)}
`

const hasBodySections = (value: unknown): value is GeneratedScript['body_sections'] =>
  Array.isArray(value) &&
  value.every((section) => {
    if (!section || typeof section !== 'object') {
      return false
    }

    const candidate = section as { heading?: unknown; content?: unknown }
    return typeof candidate.heading === 'string' && typeof candidate.content === 'string'
  })

const isValidScript = (script?: Partial<GeneratedScript>): script is GeneratedScript =>
  Boolean(
    script &&
      typeof script.title === 'string' &&
      typeof script.thumbnail_text === 'string' &&
      typeof script.hook === 'string' &&
      typeof script.intro === 'string' &&
      hasBodySections(script.body_sections) &&
      typeof script.cta === 'string' &&
      typeof script.conclusion === 'string',
  )

export const polishScript = async (input: ScriptPolishRequest): Promise<ScriptPolishResponse> => {
  const output = (await runAiJson(polishPrompt(input))) as Partial<ScriptPolishResponse>

  if (!isValidScript(output.script)) {
    throw new Error('Script polish returned an invalid script payload.')
  }

  return {
    script: output.script,
    assistant_reply: typeof output.assistant_reply === 'string' && output.assistant_reply.trim()
      ? output.assistant_reply
      : 'Script updated based on your request.',
  }
}
