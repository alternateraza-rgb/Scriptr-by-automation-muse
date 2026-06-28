import { runAiJson } from './aiProviderService.mts'
import type { ChannelContext, GeneratedScript, ScriptChatMessage } from './types.mts'

type ScriptChatInput = {
  messages: ScriptChatMessage[]
  channelContext?: ChannelContext
}

const normalizeMessages = (messages: unknown): ScriptChatMessage[] =>
  (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const candidate = message as Partial<ScriptChatMessage>
      const role: ScriptChatMessage['role'] = candidate.role === 'assistant' ? 'assistant' : 'user'
      return {
        role,
        content: typeof candidate.content === 'string' ? candidate.content.trim() : '',
      }
    })
    .filter((message) => message.content)
    .slice(-14)

const contextSummary = (context?: ChannelContext) =>
  [
    `Channel: ${context?.channelName || context?.channelProfile || 'Not specified'}`,
    `Niche: ${context?.niche || 'Not specified'}`,
    `Audience: ${context?.targetAudience || context?.audience || 'Not specified'}`,
    `Tone: ${context?.tone || 'Not specified'}`,
    `Format: ${context?.videoFormat || 'Long-form YouTube video'}`,
    `Length: ${context?.videoLength || 'Not specified'}`,
    `Notes: ${context?.userNotes || 'None'}`,
  ].join('\n')

const conversationText = (messages: ScriptChatMessage[]) =>
  messages.map((message) => `${message.role === 'assistant' ? 'Assistant' : 'Creator'}: ${message.content}`).join('\n\n')

const ASSISTANT_SYSTEM_PROMPT = `You are Scriptr's General Assistant — a friendly, knowledgeable partner for YouTube creators.

Core capabilities:
- Answer general questions, brainstorm ideas, and act as a research partner.
- Help with YouTube strategy, content planning, writing tips, creativity, and any topic the creator raises.
- Be concise unless the creator wants more detail.

Script writing expertise (activate automatically when relevant):
- Detect when the creator wants to write a video script, get video ideas, or develop an outline — phrases like "write a script for…", "I need an outline for…", "help me with a video about…", or "give me video ideas" are clear signals.
- When script intent is clear but underspecified (e.g. "help me write a script" with no topic), ask one short clarifying question at a time — such as topic, target runtime, audience, or tone. Do not dump a checklist or force a rigid workflow.
- When enough context exists for script work, operate like a senior retention strategist:
  - Ask only one question per reply until you have enough context (typically 2–5 questions total).
  - Desired video length is important — ask for target runtime before generating ideas unless already provided.
  - Prioritize niche, audience, tone, faceless vs personality-driven, and educational vs cinematic.
  - Each question must be short. No explanations, lists, paragraphs, or encouragement between questions.
- Once enough context exists, enter idea generation mode:
  - Return 4 to 6 clickable-card-ready ideas.
  - Use one line per idea in this format: IDEA: Concise Title — one-line angle
  - Do not add introductions, summaries, markdown, numbering, or paragraphs.
  - Keep titles concise and angles to one line.

Default behavior for non-script requests:
- Answer directly and helpfully without steering toward script workflows.
- Do not mention modes, toggles, or switching modes.

Return JSON only:
{
  "message": "your response to the creator"
}`

const FINAL_SCRIPT_SYSTEM_PROMPT = `You are an elite faceless YouTube documentary scriptwriter and retention editor.

Turn the strategy conversation into a polished YouTube script.

Rules:
- Write in a cinematic, human, high-retention style.
- Start with conflict immediately.
- Use short and medium-length sentences with varied rhythm.
- Build curiosity, stakes, and escalation throughout.
- Use the agreed runtime only for internal pacing and approximate depth.
- Do not include visible timestamps, time ranges, timecodes, or beat markers such as [2:35-2:40], 0:00 Intro, or 3:20 Hook.
- Use clean section headers, cinematic narrative formatting, and readable paragraph spacing.
- Avoid generic YouTube phrases, filler, robotic language, and em dashes.
- Preserve the agreed tone and audience.

Return JSON only:
{
  "script": {
    "title": "final title",
    "sections": [
      { "section": "Hook", "text": "script text" }
    ]
  }
}`

const stripTimestampFormatting = (value: string) =>
  value
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[-,]\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*\]\s*/i, '')
        .replace(/^\s*\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[\u2013\u2014]\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*\]\s*/i, '')
        .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[-,\u2013\u2014]\s*\d{1,2}:\d{2}(?::\d{2})?)?\s+/, '')
        .trim(),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const buildChatUserPrompt = (channelContext: ChannelContext | undefined, messages: ScriptChatMessage[]) =>
  `CHANNEL CONTEXT\n${contextSummary(channelContext)}\n\nCONVERSATION\n${conversationText(messages)}\n\nRespond naturally. If the creator is working on a script, follow the script workflow. If asking a question, ask only one at a time. If generating ideas, output only IDEA lines.`

export async function continueScriptChat({ messages, channelContext }: ScriptChatInput): Promise<{ message: string }> {
  const cleanMessages = normalizeMessages(messages)
  if (!cleanMessages.length) {
    throw new Error('At least one chat message is required.')
  }

  const data = await runAiJson({
    systemPrompt: ASSISTANT_SYSTEM_PROMPT,
    userPrompt: buildChatUserPrompt(channelContext, cleanMessages),
    reasoningEffort: 'medium',
  })

  return {
    message: typeof data?.message === 'string' ? data.message : 'How can I help?',
  }
}

export async function generateScriptFromChat({ messages, channelContext }: ScriptChatInput): Promise<GeneratedScript> {
  const cleanMessages = normalizeMessages(messages)
  if (!cleanMessages.length) {
    throw new Error('At least one chat message is required.')
  }

  const data = await runAiJson({
    systemPrompt: FINAL_SCRIPT_SYSTEM_PROMPT,
    userPrompt: `CHANNEL CONTEXT\n${contextSummary(channelContext)}\n\nSTRATEGY CONVERSATION\n${conversationText(cleanMessages)}\n\nWrite the final script now. Include a strong title and clear sections. Use runtime targets internally for pacing only. Do not show timestamps or timecodes in the script.`,
    reasoningEffort: 'medium',
  })

  const script = data?.script
  return {
    script: {
      title: typeof script?.title === 'string' && script.title.trim() ? script.title.trim() : 'Untitled YouTube Script',
      sections: Array.isArray(script?.sections)
        ? script.sections
            .map((section: { section?: unknown; text?: unknown }, index: number) => ({
              section: typeof section?.section === 'string' && section.section.trim() ? section.section.trim() : `Section ${index + 1}`,
              text: typeof section?.text === 'string' ? stripTimestampFormatting(section.text) : '',
            }))
            .filter((section: { text: string }) => section.text)
        : [],
    },
  }
}
