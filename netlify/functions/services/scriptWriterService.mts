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

type CleanScriptPromptPayload = {
  variables: {
    niche: string
    videoTopicIdea: string
    targetAudience: string
    tone: string
    videoLength: string
    videoFormat: string
    channelName: string
    channelStage: string
    channelStyle: string
    audiencePainPoints: string
    exampleChannels: string[]
    userNotes: string
    channelProfile: string
    selectedTitle: string
  }
  selectedIdea: {
    title: string
    concept: string
    why_it_works: string
    hook_angle: string
    click_score: 'low' | 'medium' | 'high'
    outlierStatus: 'Low' | 'Medium' | 'High'
  }
  youtubeOutlierResearch: {
    evidenceSummary: string
    winningPatterns: string[]
    saturationSignals: string[]
    opportunityGaps: string[]
    outlierSignal: string
  }
  masterOutline: Array<{ section: string; content: string }>
  sectionStructure: string[]
}

const ADVANCED_SYSTEM_PROMPT = `PROMPT_LOCK_VERSION: SCRIPTRR_V3_OUTLIER_ENGINE

You are an elite YouTube scriptwriter specializing in faceless documentary-style content designed for high retention and viral performance.

Follow these rules strictly:

WRITING RULES:
- Write like a human, not AI
- Keep sentences natural and smooth
- Avoid robotic phrasing
- Avoid filler and repetition
- Do NOT use em dashes under any circumstances
- Use simple punctuation only (commas, periods, question marks)

TONE RULES:
- You will be given a tone
- Match the tone exactly and consistently
- Do not default to neutral tone
- Do not mix tones

STRUCTURE RULES:
- Follow the required structure exactly
- Do not add extra sections
- Do not rename sections
- Do not skip sections

RETENTION RULES:
- Start strong and create curiosity immediately
- Use smooth transitions between ideas
- Keep the flow engaging and story-driven
- Avoid overexplaining

OUTPUT RULES:
- No disclaimers
- No meta commentary
- No mentioning "this script"
- Only output the final script

USER RULES PRIORITY:
- You will receive USER RULES
- Treat them as strict instructions
- Apply them throughout the output
- Do not ignore them
- If possible, combine them with tone naturally
- Do not break required structure

Return valid JSON only.`

const sectionOrder = ['Hook', 'Curiosity Gap', 'Setup', 'Main Content', 'Payoff']

const PLACEHOLDER_MATCHES = ['audience profile not set yet', 'add inspiration channels', 'add inspiration videos', 'untitled channel']
const BANNED_PHRASES = [
  'What if I told you',
  'In this video',
  "Let's dive in",
  'History is full of',
  'The answer lies in',
  'Since the beginning of time',
  'This shows that',
]

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const hasPlaceholder = (value: string) => {
  const normalized = value.toLowerCase()
  return PLACEHOLDER_MATCHES.some((placeholder) => normalized.includes(placeholder))
}

const cleanText = (value: unknown) => {
  const normalized = normalizeWhitespace(asString(value))
  return normalized && !hasPlaceholder(normalized) ? normalized : ''
}

const cleanList = (value: unknown) => {
  const items = Array.isArray(value) ? value : []
  return items
    .map((item) => cleanText(item))
    .filter((item): item is string => Boolean(item))
}

const withFallback = (value: string, fallback: string) => (value ? value : fallback)

const normalizeOutlierStatus = (value: unknown): 'Low' | 'Medium' | 'High' => {
  const normalized = asString(value).toLowerCase()
  if (normalized === 'high') {
    return 'High'
  }
  if (normalized === 'low') {
    return 'Low'
  }
  return 'Medium'
}

const normalizeClickScore = (value: unknown): 'low' | 'medium' | 'high' => {
  const normalized = asString(value).toLowerCase()
  if (normalized === 'low') {
    return 'low'
  }
  if (normalized === 'medium') {
    return 'medium'
  }
  return 'high'
}

const estimateWordTarget = (videoLength: string) => {
  const matches =
    videoLength
      .match(/\d+/g)
      ?.map((value) => Number(value))
      .filter((value) => !Number.isNaN(value)) || []
  if (!matches.length) {
    return 1400
  }

  const averageMinutes = matches.length >= 2 ? (matches[0] + matches[1]) / 2 : matches[0]
  return Math.max(700, Math.round(averageMinutes * 135))
}

const buildLengthTargets = (videoLength: string) => {
  const targetWords = estimateWordTarget(videoLength)
  return {
    targetWords,
    minimumWords: Math.max(650, Math.round(targetWords * 0.9)),
    maximumWords: Math.round(targetWords * 1.1),
  }
}

const countWords = (value: string) => value.split(/\s+/).map((part) => part.trim()).filter(Boolean).length

const countScriptWords = (script: GeneratedScript) => script.script.sections.reduce((total, section) => total + countWords(section.text), 0)

const sanitizeGeneratedText = (value: string) => {
  const withoutFences = value
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .replace(/[—–]/g, ',')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()

  const normalizedLines = withoutFences
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+,/g, ',')
        .replace(/,\s*,+/g, ', ')
        .trim(),
    )
    .join('\n')

  return normalizedLines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

const buildChapterTitleFromChunk = (chunk: string, index: number) => {
  const fallbackTitles = ['Opening Shift', 'Pressure Builds', 'The Turning Point', 'What Comes Next']
  const firstSentence = chunk
    .split(/[.!?]\s+/)[0]
    ?.replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!firstSentence) {
    return fallbackTitles[index] || `Chapter ${index + 1}`
  }

  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'is',
    'are',
    'was',
    'were',
    'that',
    'this',
    'it',
    'as',
    'at',
    'by',
    'from',
    'into',
    'their',
    'they',
    'his',
    'her',
    'its',
    'you',
    'your',
  ])

  const keywords = firstSentence
    .split(' ')
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 2 && !commonWords.has(word))

  const pickedWords = keywords.slice(0, 5)
  if (!pickedWords.length) {
    return fallbackTitles[index] || `Chapter ${index + 1}`
  }

  return toTitleCase(pickedWords.join(' '))
}

const ensureMainContentHasChapters = (text: string) => {
  const normalized = sanitizeGeneratedText(text)
  if (!normalized) {
    return normalized
  }
  if (/^chapter\s+\d+\s*:/im.test(normalized)) {
    return normalized
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) || []
  if (!sentences.length) {
    return normalized
  }

  const chapterCount = sentences.length >= 24 ? 4 : 3
  const chunkSize = Math.max(1, Math.ceil(sentences.length / chapterCount))
  const chunks: string[] = []
  for (let index = 0; index < sentences.length; index += chunkSize) {
    chunks.push(sentences.slice(index, index + chunkSize).join(' '))
  }

  return chunks
    .slice(0, chapterCount)
    .map((chunk, index) => `Chapter ${index + 1}: ${buildChapterTitleFromChunk(chunk, index)}\n${chunk}`)
    .join('\n\n')
}

const toneDefinitions = `## TONE DEFINITIONS:

Conversational:
- Casual, simple, clear
- Feels like talking to a friend

Dark:
- Serious, tense, slightly dramatic
- Focus on suspense and intensity

High Energy:
- Fast-paced, punchy, exciting
- Short impactful sentences

Dramatic:
- Intense and emotional with clear stakes
- Builds urgency and tension

Authoritative:
- Confident, direct, and expert-led
- Clear claims supported by reasoning

Educational:
- Clear, explanatory, and structured
- Teaches while keeping momentum

Cinematic:
- Visual, atmospheric, and story-led
- Uses vivid pacing and scene flow

Viral / punchy:
- Sharp and provocative with strong hooks
- Compact lines built for momentum

Luxury:
- Polished, premium, and aspirational
- Precise language with understated confidence

Motivating:
- Uplifting and action-oriented
- Encourages with clear momentum

Documentary:
- Investigative, grounded, and narrative
- Evidence-led with smooth storytelling

Custom:
- Match the provided custom tone description exactly
- Stay consistent from start to finish`

const cleanPromptPayload = (input: ScriptWriterInput): CleanScriptPromptPayload => {
  const context = input.context || ({} as ChannelContext)

  const niche = withFallback(cleanText(context.niche), 'History documentaries')
  const videoTopicIdea = withFallback(cleanText(context.videoTopicIdea), `${niche} hidden patterns and untold turning points`)
  const targetAudience = withFallback(cleanText(context.targetAudience || context.audience), 'Curious viewers who want deep, surprising, evidence-backed breakdowns')
  const tone = withFallback(cleanText(input.tone || context.tone), 'Cinematic')
  const videoLength = withFallback(cleanText(input.videoLength || context.videoLength), '10-12 minutes')
  const videoFormat = withFallback(cleanText(context.videoFormat), 'Long-form faceless videos')

  const selectedIdea = {
    title: withFallback(cleanText(input.selectedIdea?.title), `The hidden shift behind ${videoTopicIdea}`),
    concept: withFallback(cleanText(input.selectedIdea?.concept), `Narration-first exploration of a counterintuitive angle in ${videoTopicIdea}.`),
    why_it_works: withFallback(
      cleanText(input.selectedIdea?.why_it_works),
      'Leverages proven curiosity packaging, contrast, and unresolved tension from top-performing niche videos.',
    ),
    hook_angle: withFallback(cleanText(input.selectedIdea?.hook_angle), 'Open with a confident myth, then break it with uncomfortable evidence.'),
    click_score: normalizeClickScore(input.selectedIdea?.click_score),
    outlierStatus: normalizeOutlierStatus(input.selectedIdea?.outlierStatus),
  }

  const outlineSections = Array.isArray(input.generatedOutline)
    ? input.generatedOutline
        .map((entry) => ({
          section: cleanText(entry?.section),
          content: cleanText(entry?.content),
        }))
        .filter((entry) => entry.section && entry.content)
    : []

  const evidenceSummary = `${selectedIdea.why_it_works} Outlier signal: ${selectedIdea.outlierStatus}. Click potential: ${selectedIdea.click_score}.`

  return {
    variables: {
      niche,
      videoTopicIdea,
      targetAudience,
      tone,
      videoLength,
      videoFormat,
      channelName: withFallback(cleanText(context.channelName), `${niche} Channel`),
      channelStage: withFallback(cleanText(context.channelStage), 'Early growth'),
      channelStyle: withFallback(cleanText(context.channelStyle), 'Narration-first faceless storytelling'),
      audiencePainPoints: withFallback(
        cleanText(context.audiencePainPoints),
        `This audience wants ${niche.toLowerCase()} content with clear stakes and practical payoff.`,
      ),
      exampleChannels: cleanList(context.exampleChannels),
      userNotes: cleanText(context.userNotes),
      channelProfile: cleanText(context.channelProfile),
      selectedTitle: withFallback(cleanText(input.selectedTitle), selectedIdea.title),
    },
    selectedIdea,
    youtubeOutlierResearch: {
      evidenceSummary,
      winningPatterns: [
        selectedIdea.hook_angle,
        'Clear tension in first 20 seconds',
        'Progressive reveals with concrete details',
      ],
      saturationSignals: ['Overused broad history recaps', 'Slow intros with no immediate stakes'],
      opportunityGaps: ['Counter-narrative angle backed by evidence', 'Under-discussed cause-and-effect chain'],
      outlierSignal: selectedIdea.outlierStatus,
    },
    masterOutline: outlineSections,
    sectionStructure: sectionOrder,
  }
}

const buildScriptPrompt = (payload: CleanScriptPromptPayload) => {
  const lengthTargets = buildLengthTargets(payload.variables.videoLength)
  const exampleChannels = payload.variables.exampleChannels.length ? payload.variables.exampleChannels.join(', ') : 'None provided'
  const userRules = payload.variables.userNotes || 'No additional user rules provided.'
  const topic = payload.variables.videoTopicIdea || payload.selectedIdea.title

  return `${toneDefinitions}

## CONTEXT BLOCK:

CHANNEL CONTEXT:
Niche: ${payload.variables.niche}
Target Audience: ${payload.variables.targetAudience}
Tone: ${payload.variables.tone}
Video Length: ${payload.variables.videoLength}
Video Format: ${payload.variables.videoFormat}
Example Channels: ${exampleChannels}

TOPIC:
${topic}

---

## USER RULES BLOCK:

USER RULES:
${userRules}

Follow these USER RULES carefully.
Treat them as required instructions, not suggestions.

---

## TASK PROMPT:

Write a high-retention YouTube script using this exact structure:

Hook
Curiosity Gap
Setup
Main Content
Payoff

IMPORTANT:
- Follow this structure exactly
- Do not add extra sections
- Do not rename sections

STYLE:
- Match the selected tone exactly: ${payload.variables.tone}
- Apply USER RULES throughout the script
- Keep writing natural and engaging
- Avoid fluff
- Do not use em dashes
- Never use these banned phrases: ${BANNED_PHRASES.join('; ')}
- Keep total word count between ${lengthTargets.minimumWords} and ${lengthTargets.maximumWords} words
- Target close to ${lengthTargets.targetWords} words

FORMATTING RULES:
- Keep section text in clean, evenly spaced paragraphs
- Split long blocks into short paragraphs for readability
- In Main Content, include 3 to 5 chapters with unique relevant titles
- Format chapter headers exactly like: Chapter 1: [Unique Title]
- Add one blank line between each paragraph and chapter block

Make the script feel like a viral YouTube documentary.

Return JSON only in this exact shape:
{
  "script": {
    "title": "...",
    "sections": [
      { "section": "Hook", "text": "..." },
      { "section": "Curiosity Gap", "text": "..." },
      { "section": "Setup", "text": "..." },
      { "section": "Main Content", "text": "..." },
      { "section": "Payoff", "text": "..." }
    ]
  }
}`
}

const buildLengthCorrectionPrompt = (
  payload: CleanScriptPromptPayload,
  script: GeneratedScript,
  minimumWords: number,
  maximumWords: number,
  targetWords: number,
) => `Cleaned variables:\n${JSON.stringify(payload.variables, null, 2)}

Current draft script:\n${JSON.stringify(script, null, 2)}

Strict rewrite rules:
- Keep the same section order and JSON shape.
- Preserve storyline logic and facts.
- Rewrite to between ${minimumWords} and ${maximumWords} words.
- Target close to ${targetWords} words.
- Keep tone aligned exactly to: ${payload.variables.tone}.
- Apply USER RULES exactly as required: ${payload.variables.userNotes || 'No additional user rules provided.'}
- No generic phrasing and no em dashes.
- Keep clean paragraph spacing with one blank line between paragraphs.
- Main Content must include 3 to 5 chapter headers in the format: Chapter 1: [Unique Title].

Return JSON only in this exact shape:
{
  "script": {
    "title": "...",
    "sections": [
      { "section": "Hook", "text": "..." },
      { "section": "Curiosity Gap", "text": "..." },
      { "section": "Setup", "text": "..." },
      { "section": "Main Content", "text": "..." },
      { "section": "Payoff", "text": "..." }
    ]
  }
}`

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
  const cleanedPayload = cleanPromptPayload(input)
  const userPrompt = buildScriptPrompt(cleanedPayload)

  console.log('[generateScript] prompt preview', {
    cleanedPromptPayload: cleanedPayload,
    activeSystemPrompt: ADVANCED_SYSTEM_PROMPT,
    activeUserPromptSummary: {
      selectedTitle: cleanedPayload.variables.selectedTitle,
      tone: cleanedPayload.variables.tone,
      videoLength: cleanedPayload.variables.videoLength,
      outlierSignal: cleanedPayload.youtubeOutlierResearch.outlierSignal,
      sectionCount: cleanedPayload.sectionStructure.length,
      bannedPhraseCount: BANNED_PHRASES.length,
      userPromptCharacters: userPrompt.length,
    },
  })

  const output = (await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt,
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

  const normalizedScript = {
    script: {
      title: sanitizeGeneratedText(title),
      sections: sectionOrder.map((section) => ({
        section,
        text:
          section === 'Main Content'
            ? ensureMainContentHasChapters(sectionMap.get(section.toLowerCase()) || '')
            : sanitizeGeneratedText(sectionMap.get(section.toLowerCase()) || ''),
      })),
    },
  }

  const lengthTargets = buildLengthTargets(cleanedPayload.variables.videoLength)
  const wordCount = countScriptWords(normalizedScript)
  if (wordCount >= lengthTargets.minimumWords && wordCount <= lengthTargets.maximumWords) {
    return normalizedScript
  }

  const correctionOutput = (await runAiJson({
    systemPrompt: ADVANCED_SYSTEM_PROMPT,
    userPrompt: buildLengthCorrectionPrompt(
      cleanedPayload,
      normalizedScript,
      lengthTargets.minimumWords,
      lengthTargets.maximumWords,
      lengthTargets.targetWords,
    ),
    temperature: 0.6,
  })) as Partial<GeneratedScript>

  const correctedScript = correctionOutput.script
  if (!correctedScript || typeof correctedScript !== 'object') {
    return normalizedScript
  }

  const correctedSections = Array.isArray(correctedScript.sections) ? correctedScript.sections : []
  const correctedMap = new Map<string, string>()
  for (const item of correctedSections) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const section = typeof item.section === 'string' ? item.section.trim() : ''
    const text = typeof item.text === 'string' ? item.text.trim() : ''
    if (section && text) {
      correctedMap.set(section.toLowerCase(), text)
    }
  }

  return {
    script: {
      title:
        typeof correctedScript.title === 'string' && correctedScript.title.trim()
          ? sanitizeGeneratedText(correctedScript.title.trim())
          : normalizedScript.script.title,
      sections: sectionOrder.map((section) => ({
        section,
        text:
          section === 'Main Content'
            ? ensureMainContentHasChapters(
                correctedMap.get(section.toLowerCase()) || normalizedScript.script.sections.find((item) => item.section === section)?.text || '',
              )
            : sanitizeGeneratedText(
                correctedMap.get(section.toLowerCase()) || normalizedScript.script.sections.find((item) => item.section === section)?.text || '',
              ),
      })),
    },
  }
}
