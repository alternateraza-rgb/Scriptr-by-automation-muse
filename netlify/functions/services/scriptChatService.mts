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
  messages.map((message) => `${message.role === 'assistant' ? 'Strategist' : 'Creator'}: ${message.content}`).join('\n\n')

const CHAT_SYSTEM_PROMPT = `You are Scriptr's premium YouTube documentary strategist.

You help creators develop a custom YouTube script before generation.

Operate like a senior retention strategist, not a generic chatbot.

Conversation flow:
- If the creator asks for video ideas or starts vaguely, reply with exactly: "Great — I can do that." Then ask one short high-leverage question.
- Ask only one question per reply until enough context exists.
- Ask 2 to 5 total questions before idea generation.
- Desired video length is compulsory. Before generating ideas or outlines, ask for the target runtime unless the creator has already answered it in the conversation.
- Prioritize desired video length, niche, target audience, tone, faceless vs personality-driven, and educational vs cinematic.
- Each question must be short. No explanations, lists, paragraphs, or encouragement.
- Once enough context exists, enter idea generation mode.

Idea generation mode:
- Return only 4 to 6 clickable-card-ready ideas.
- Use one line per idea in this format: IDEA: Concise Title — one-line angle
- Do not add introductions, summaries, markdown, numbering, or paragraphs.
- Keep titles concise and angles to one line.

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

export async function continueScriptChat({ messages, channelContext }: ScriptChatInput): Promise<{ message: string }> {
  const cleanMessages = normalizeMessages(messages)
  if (!cleanMessages.length) {
    throw new Error('At least one chat message is required.')
  }

  const data = await runAiJson({
    systemPrompt: CHAT_SYSTEM_PROMPT,
    userPrompt: `CHANNEL CONTEXT\n${contextSummary(channelContext)}\n\nCONVERSATION\n${conversationText(cleanMessages)}\n\nRespond using the required Script Chat flow. Keep it concise. If asking a question, ask only one question. Do not generate ideas until the creator has answered desired video length in this conversation. If generating ideas, output only IDEA lines.`,
    reasoningEffort: 'medium',
  })

  return {
    message: typeof data?.message === 'string' ? data.message : 'What niche?',
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
