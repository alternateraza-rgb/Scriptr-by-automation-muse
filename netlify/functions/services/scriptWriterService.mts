import { AiTimeoutError, runAiJson, runAiJsonWithTimeout } from './aiProviderService.mts'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './types.mts'
import type { ScriptGenerationJobRecord, ScriptGenerationJobUpdate } from './scriptGenerationJobStore.mts'

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

const ADVANCED_SYSTEM_PROMPT = `You are an elite faceless YouTube documentary scriptwriter.

Write engaging, high-retention scripts that feel human and cinematic.

RULES:
- Never sound robotic or corporate.
- Avoid generic YouTube phrases.
- Avoid repetitive sentence patterns.
- Avoid filler.
- Avoid em dashes.
- Keep the writing emotionally controlled and natural.

STYLE:
- Short and medium-length sentences.
- Strong pacing and rhythm variation.
- Build curiosity constantly.
- Escalate tension throughout the script.
- Prioritize storytelling over explaining.
- Every paragraph should make the viewer want to continue.

PACING:
- Start with conflict immediately.
- No long introductions.
- Reveal information progressively.
- Include occasional strong standalone lines for emphasis.

OUTPUT:
- Only output the script.
- No explanations.
- No notes.
- Never include visible timestamps, time ranges, timecodes, or beat markers.
- Use runtime targets only internally for pacing and depth.`

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
        .replace(/^\s*\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[-,]\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*\]\s*/i, '')
        .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[-,]\s*\d{1,2}:\d{2}(?::\d{2})?)?\s+/, '')
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
- Use the video length only as an internal pacing and word-count target
- Do not include visible timestamps, time ranges, timecodes, or beat markers like [2:35-2:40], 0:00 Intro, or 3:20 Hook
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
- No visible timestamps, time ranges, timecodes, or beat markers.
- Use runtime targets only internally for pacing and depth.
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
    temperature: 0.9,
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
    temperature: 0.9,
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

type ScriptGenerationStep = 'outline' | 'section' | 'polish' | 'completed'

type ScriptGenerationProgress = {
  currentStep: ScriptGenerationStep
  currentSectionIndex: number
  outline: OutlineSection[]
  sections: Array<{ section: string; text: string }>
  attempts: Record<string, number>
  nextRetryAt: string | null
  lastError: string | null
}

export type ScriptGenerationPublicJob = {
  jobId: string
  status: 'queued' | 'generating' | 'completed' | 'failed'
  currentStep: ScriptGenerationStep
  currentSectionIndex: number
  totalSections: number
  completedSections: number
  retryAfterMs: number
  error: string | null
  script?: GeneratedScript
}

const SCRIPT_STEP_TIMEOUT_MS = 18000
const MAX_STEP_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1200

const sectionWordWeights: Record<string, number> = {
  hook: 0.12,
  'curiosity gap': 0.14,
  setup: 0.16,
  'main content': 0.46,
  payoff: 0.12,
}

const relevanceStopWords = new Set([
  'about',
  'after',
  'again',
  'against',
  'because',
  'before',
  'between',
  'channel',
  'content',
  'could',
  'every',
  'their',
  'there',
  'these',
  'thing',
  'those',
  'through',
  'video',
  'where',
  'which',
  'would',
])

const createInitialProgress = (): ScriptGenerationProgress => ({
  currentStep: 'outline',
  currentSectionIndex: 0,
  outline: [],
  sections: [],
  attempts: {},
  nextRetryAt: null,
  lastError: null,
})

export const createInitialScriptGenerationProgress = () => createInitialProgress()

const normalizeProgress = (value: unknown): ScriptGenerationProgress => {
  const progress = value && typeof value === 'object' ? (value as Partial<ScriptGenerationProgress>) : {}
  const currentStep =
    progress.currentStep === 'section' || progress.currentStep === 'polish' || progress.currentStep === 'completed'
      ? progress.currentStep
      : 'outline'

  return {
    currentStep,
    currentSectionIndex: Number.isInteger(progress.currentSectionIndex) ? Math.max(0, progress.currentSectionIndex || 0) : 0,
    outline: Array.isArray(progress.outline)
      ? progress.outline
          .map((item) => ({
            section: cleanText((item as OutlineSection)?.section),
            content: cleanText((item as OutlineSection)?.content),
          }))
          .filter((item) => item.section && item.content)
      : [],
    sections: Array.isArray(progress.sections)
      ? progress.sections
          .map((item) => ({
            section: cleanText((item as { section?: string })?.section),
            text: sanitizeGeneratedText((item as { text?: string })?.text || ''),
          }))
          .filter((item) => item.section && item.text)
      : [],
    attempts: progress.attempts && typeof progress.attempts === 'object' ? { ...progress.attempts } : {},
    nextRetryAt: typeof progress.nextRetryAt === 'string' ? progress.nextRetryAt : null,
    lastError: typeof progress.lastError === 'string' ? progress.lastError : null,
  }
}

const normalizeScriptWriterInput = (value: unknown): ScriptWriterInput => {
  const input = value && typeof value === 'object' ? (value as Partial<ScriptWriterInput>) : {}
  return {
    context: input.context || ({} as ChannelContext),
    selectedIdea: input.selectedIdea || ({} as VideoIdea),
    selectedTitle: asString(input.selectedTitle),
    generatedOutline: Array.isArray(input.generatedOutline) ? input.generatedOutline : [],
    tone: typeof input.tone === 'string' ? input.tone : undefined,
    videoLength: typeof input.videoLength === 'string' ? input.videoLength : undefined,
  }
}

const isRetryReady = (progress: ScriptGenerationProgress) => {
  if (!progress.nextRetryAt) {
    return true
  }
  return new Date(progress.nextRetryAt).getTime() <= Date.now()
}

const getRetryAfterMs = (progress: ScriptGenerationProgress) => {
  if (!progress.nextRetryAt) {
    return 0
  }
  return Math.max(0, new Date(progress.nextRetryAt).getTime() - Date.now())
}

const getSectionWordTarget = (section: string, targetWords: number) => {
  const weight = sectionWordWeights[section.toLowerCase()] || 0.16
  return Math.max(section.toLowerCase() === 'main content' ? 260 : 80, Math.round(targetWords * weight))
}

const extractKeywords = (...values: string[]) => {
  const keywords = values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !relevanceStopWords.has(word))

  return [...new Set(keywords)].slice(0, 18)
}

const hasRelevantKeyword = (text: string, keywords: string[]) => {
  if (!keywords.length) {
    return true
  }
  const normalized = text.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

const looksCutOff = (text: string) => {
  const normalized = text.trim()
  if (!normalized) {
    return true
  }
  if (!/[.!?]"?\)?$/.test(normalized)) {
    return true
  }
  return /\b(and|as|because|but|for|from|if|into|of|or|so|that|the|then|to|when|where|while|with)$/i.test(normalized)
}

const validateSectionText = (
  section: string,
  text: string,
  outlineContent: string,
  payload: CleanScriptPromptPayload,
) => {
  const sanitized = sanitizeGeneratedText(text)
  const wordTarget = getSectionWordTarget(section, buildLengthTargets(payload.variables.videoLength).targetWords)
  const minimumWords = Math.max(section.toLowerCase() === 'main content' ? 180 : 45, Math.round(wordTarget * 0.45))

  if (countWords(sanitized) < minimumWords) {
    throw new Error(`${section} came back too short to use safely.`)
  }

  if (looksCutOff(sanitized)) {
    throw new Error(`${section} appears to be cut off.`)
  }

  const keywords = extractKeywords(payload.variables.selectedTitle, payload.variables.videoTopicIdea, payload.selectedIdea.concept, outlineContent)
  if (!hasRelevantKeyword(sanitized, keywords)) {
    throw new Error(`${section} does not appear relevant to the selected topic.`)
  }
}

const validateCompleteScript = (script: GeneratedScript, payload: CleanScriptPromptPayload) => {
  const sections = Array.isArray(script.script.sections) ? script.script.sections : []
  const sectionMap = new Map(sections.map((section) => [section.section.toLowerCase(), section.text]))

  for (const section of sectionOrder) {
    const text = sectionMap.get(section.toLowerCase()) || ''
    validateSectionText(section, text, section, payload)
  }

  if (!sectionMap.get('hook') || !sectionMap.get('main content') || !sectionMap.get('payoff')) {
    throw new Error('Final script is missing an intro, body, or conclusion section.')
  }
}

const buildJobOutlinePrompt = (payload: CleanScriptPromptPayload) => `Cleaned variables:\n${JSON.stringify(payload.variables, null, 2)}

Selected idea:\n${JSON.stringify(payload.selectedIdea, null, 2)}

Existing outline from the app:\n${JSON.stringify(payload.masterOutline, null, 2)}

Create the durable generation outline for a complete YouTube script.

Rules:
- Use exactly these sections, in this exact order: ${sectionOrder.join(', ')}.
- Treat Hook as the intro.
- Treat Main Content as the body and include chapter beats.
- Treat Payoff as the conclusion.
- Include a transition goal for every section except Payoff.
- Make every section specific to the selected title and topic.
- Do not write the full script yet.

Return JSON only:
{
  "outline": [
    { "section": "Hook", "content": "specific beats and transition goal..." },
    { "section": "Curiosity Gap", "content": "specific beats and transition goal..." },
    { "section": "Setup", "content": "specific beats and transition goal..." },
    { "section": "Main Content", "content": "specific chapter beats and transition goal..." },
    { "section": "Payoff", "content": "specific conclusion beats..." }
  ]
}`

const normalizeOutlineOutput = (output: unknown, input: ScriptWriterInput) => {
  const sourceOutline = Array.isArray(input.generatedOutline) ? input.generatedOutline : []
  const raw = output && typeof output === 'object' ? (output as { outline?: unknown; sections?: unknown }) : {}
  const rawOutline = Array.isArray(raw.outline) ? raw.outline : Array.isArray(raw.sections) ? raw.sections : []
  const outlineMap = new Map<string, string>()

  for (const item of rawOutline) {
    const entry = item && typeof item === 'object' ? (item as { section?: unknown; content?: unknown; text?: unknown }) : {}
    const section = cleanText(entry.section)
    const content = cleanText(entry.content) || cleanText(entry.text)
    if (section && content) {
      outlineMap.set(section.toLowerCase(), content)
    }
  }

  for (const item of sourceOutline) {
    const section = cleanText(item.section)
    const content = cleanText(item.content)
    if (section && content && !outlineMap.has(section.toLowerCase())) {
      outlineMap.set(section.toLowerCase(), content)
    }
  }

  const outline = sectionOrder.map((section) => ({
    section,
    content: outlineMap.get(section.toLowerCase()) || `Write the ${section} for ${input.selectedTitle}.`,
  }))

  if (outline.some((item) => countWords(item.content) < 6)) {
    throw new Error('Generated outline was incomplete.')
  }

  return outline
}

const buildSectionPrompt = (
  payload: CleanScriptPromptPayload,
  outline: OutlineSection[],
  completedSections: Array<{ section: string; text: string }>,
  section: string,
) => {
  const lengthTargets = buildLengthTargets(payload.variables.videoLength)
  const sectionTarget = getSectionWordTarget(section, lengthTargets.targetWords)
  const outlineContent = outline.find((item) => item.section.toLowerCase() === section.toLowerCase())?.content || section
  const previousContext = completedSections.length ? JSON.stringify(completedSections, null, 2) : 'No previous sections written yet.'

  return `${toneDefinitions}

Cleaned variables:\n${JSON.stringify(payload.variables, null, 2)}

Selected idea:\n${JSON.stringify(payload.selectedIdea, null, 2)}

Generation outline:\n${JSON.stringify(outline, null, 2)}

Previous completed sections:\n${previousContext}

Write only this section now: ${section}

Section plan:
${outlineContent}

Rules:
- Return only this one section.
- Write approximately ${sectionTarget} words.
- Keep it specific to the selected title: ${payload.variables.selectedTitle}.
- Match tone exactly: ${payload.variables.tone}.
- Avoid fluff, generic YouTube phrases, em dashes, timestamps, beat markers, and these banned phrases: ${BANNED_PHRASES.join('; ')}.
- Make the section complete; do not end mid-thought.
- Include a natural transition into the next section unless this is Payoff.
- If this is Main Content, include 3 to 5 chapter headers formatted exactly like: Chapter 1: [Unique Title].
- If this is Payoff, make it function as the conclusion.

Return JSON only:
{
  "section": {
    "section": "${section}",
    "text": "..."
  }
}`
}

const normalizeSectionOutput = (output: unknown, expectedSection: string) => {
  const raw = output && typeof output === 'object' ? (output as { section?: unknown; script?: unknown }) : {}
  const sectionObject =
    raw.section && typeof raw.section === 'object'
      ? (raw.section as { section?: unknown; text?: unknown })
      : Array.isArray((raw.script as { sections?: unknown[] } | undefined)?.sections)
        ? (((raw.script as { sections?: unknown[] }).sections || [])[0] as { section?: unknown; text?: unknown })
        : null

  const text = sanitizeGeneratedText(asString(sectionObject?.text))
  return {
    section: cleanText(sectionObject?.section) || expectedSection,
    text: expectedSection === 'Main Content' ? ensureMainContentHasChapters(text) : text,
  }
}

const toScriptFromSections = (title: string, sections: Array<{ section: string; text: string }>): GeneratedScript => {
  const sectionMap = new Map(sections.map((section) => [section.section.toLowerCase(), section.text]))
  return {
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
}

const buildFinalPolishPrompt = (payload: CleanScriptPromptPayload, script: GeneratedScript) => `Cleaned variables:\n${JSON.stringify(payload.variables, null, 2)}

Section-by-section draft:\n${JSON.stringify(script, null, 2)}

Polish this script into the final clean version.

Rules:
- Keep the same JSON shape and exact section order: ${sectionOrder.join(', ')}.
- Keep Hook as the intro, Main Content as the body, and Payoff as the conclusion.
- Preserve all useful details from the draft.
- Smooth transitions between sections.
- Fix awkward repetition and formatting.
- Keep paragraphs clean with one blank line between paragraphs.
- Main Content must include 3 to 5 chapter headers in the format: Chapter 1: [Unique Title].
- Do not add notes, timestamps, time ranges, beat markers, markdown fences, or explanations.
- Do not use em dashes.
- Avoid these banned phrases: ${BANNED_PHRASES.join('; ')}.
- The final script must be complete and must not end mid-thought.

Return JSON only:
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

const normalizeScriptOutput = (output: unknown, fallback: GeneratedScript): GeneratedScript => {
  const raw = output && typeof output === 'object' ? (output as Partial<GeneratedScript>) : {}
  const rawScript = raw.script && typeof raw.script === 'object' ? raw.script : null
  if (!rawScript) {
    return fallback
  }

  const rawSections = Array.isArray(rawScript.sections) ? rawScript.sections : []
  const sectionMap = new Map<string, string>()
  for (const item of rawSections) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const section = cleanText((item as { section?: unknown }).section)
    const text = sanitizeGeneratedText(asString((item as { text?: unknown }).text))
    if (section && text) {
      sectionMap.set(section.toLowerCase(), text)
    }
  }

  const fallbackMap = new Map(fallback.script.sections.map((section) => [section.section.toLowerCase(), section.text]))
  return {
    script: {
      title: sanitizeGeneratedText(rawScript.title || fallback.script.title),
      sections: sectionOrder.map((section) => ({
        section,
        text:
          section === 'Main Content'
            ? ensureMainContentHasChapters(sectionMap.get(section.toLowerCase()) || fallbackMap.get(section.toLowerCase()) || '')
            : sanitizeGeneratedText(sectionMap.get(section.toLowerCase()) || fallbackMap.get(section.toLowerCase()) || ''),
      })),
    },
  }
}

const getStepLabel = (stepKey: string) => {
  if (stepKey === 'outline') {
    return 'outline planning'
  }
  if (stepKey === 'polish') {
    return 'final polish'
  }
  const sectionIndex = Number(stepKey.split(':')[1])
  return Number.isInteger(sectionIndex) ? `${sectionOrder[sectionIndex] || 'script section'} generation` : 'script generation'
}

const getStepErrorMessage = (stepKey: string, error: unknown) => {
  const stepLabel = getStepLabel(stepKey)
  if (error instanceof AiTimeoutError) {
    return `${stepLabel} timed out. Retrying from the last saved checkpoint.`
  }
  if (error instanceof Error && error.message.trim()) {
    return `${stepLabel} failed: ${error.message}`
  }
  return `${stepLabel} failed.`
}

const buildFailureUpdate = (progress: ScriptGenerationProgress, stepKey: string, error: unknown): ScriptGenerationJobUpdate => {
  const attempts = (progress.attempts[stepKey] || 0) + 1
  const nextAttempts = { ...progress.attempts, [stepKey]: attempts }
  const message = getStepErrorMessage(stepKey, error)

  if (attempts >= MAX_STEP_ATTEMPTS) {
    return {
      status: 'failed',
      progress: {
        ...progress,
        attempts: nextAttempts,
        nextRetryAt: null,
        lastError: message,
      },
      error_message: 'We could not finish this script safely after several attempts. Please try again.',
    }
  }

  return {
    status: 'generating',
    progress: {
      ...progress,
      attempts: nextAttempts,
      nextRetryAt: new Date(Date.now() + RETRY_BASE_DELAY_MS * 2 ** (attempts - 1)).toISOString(),
      lastError: message,
    },
    error_message: null,
  }
}

const runStepJson = (input: Parameters<typeof runAiJsonWithTimeout>[0]) => runAiJsonWithTimeout(input, SCRIPT_STEP_TIMEOUT_MS)

export const toPublicScriptGenerationJob = (job: ScriptGenerationJobRecord): ScriptGenerationPublicJob => {
  const progress = normalizeProgress(job.progress)
  const result = job.result && typeof job.result === 'object' ? (job.result as GeneratedScript) : undefined
  return {
    jobId: job.id,
    status: job.status,
    currentStep: progress.currentStep,
    currentSectionIndex: progress.currentSectionIndex,
    totalSections: sectionOrder.length,
    completedSections: progress.sections.length,
    retryAfterMs: getRetryAfterMs(progress),
    error: job.status === 'failed' ? job.error_message || progress.lastError || 'Script generation failed.' : null,
    script: job.status === 'completed' ? result : undefined,
  }
}

export const advanceScriptGenerationJob = async (job: ScriptGenerationJobRecord): Promise<ScriptGenerationJobUpdate> => {
  if (job.status === 'completed' || job.status === 'failed') {
    return {}
  }

  const progress = normalizeProgress(job.progress)
  if (!isRetryReady(progress)) {
    return job.status === 'queued' ? { status: 'generating' } : {}
  }

  const input = normalizeScriptWriterInput(job.request_payload)
  const cleanedPayload = cleanPromptPayload(input)

  if (!progress.outline.length) {
    const stepKey = 'outline'
    try {
      const output = await runStepJson({
        systemPrompt: ADVANCED_SYSTEM_PROMPT,
        userPrompt: buildJobOutlinePrompt(cleanedPayload),
        temperature: 0.7,
      })
      const outline = normalizeOutlineOutput(output, input)
      return {
        status: 'generating',
        progress: {
          ...progress,
          currentStep: 'section',
          currentSectionIndex: 0,
          outline,
          nextRetryAt: null,
          lastError: null,
        },
        error_message: null,
      }
    } catch (error) {
      console.error('[script-generation] outline step failed', { jobId: job.id, error })
      return buildFailureUpdate(progress, stepKey, error)
    }
  }

  const nextSectionIndex = sectionOrder.findIndex((section) => {
    const existing = progress.sections.find((item) => item.section.toLowerCase() === section.toLowerCase())
    return !existing?.text
  })

  if (nextSectionIndex !== -1) {
    const section = sectionOrder[nextSectionIndex]
    const stepKey = `section:${nextSectionIndex}`
    try {
      const output = await runStepJson({
        systemPrompt: ADVANCED_SYSTEM_PROMPT,
        userPrompt: buildSectionPrompt(cleanedPayload, progress.outline, progress.sections, section),
        temperature: 0.85,
      })
      const generatedSection = normalizeSectionOutput(output, section)
      const outlineContent = progress.outline.find((item) => item.section.toLowerCase() === section.toLowerCase())?.content || section
      validateSectionText(section, generatedSection.text, outlineContent, cleanedPayload)

      const sectionMap = new Map(progress.sections.map((item) => [item.section.toLowerCase(), item]))
      sectionMap.set(section.toLowerCase(), { section, text: generatedSection.text })
      const sections = sectionOrder
        .map((orderedSection) => sectionMap.get(orderedSection.toLowerCase()))
        .filter((item): item is { section: string; text: string } => Boolean(item))

      return {
        status: 'generating',
        progress: {
          ...progress,
          currentStep: sections.length >= sectionOrder.length ? 'polish' : 'section',
          currentSectionIndex: Math.min(sections.length, sectionOrder.length - 1),
          sections,
          nextRetryAt: null,
          lastError: null,
        },
        error_message: null,
      }
    } catch (error) {
      console.error('[script-generation] section step failed', { jobId: job.id, section, error })
      return buildFailureUpdate({ ...progress, currentStep: 'section', currentSectionIndex: nextSectionIndex }, stepKey, error)
    }
  }

  const stepKey = 'polish'
  try {
    const assembledScript = toScriptFromSections(cleanedPayload.variables.selectedTitle, progress.sections)
    validateCompleteScript(assembledScript, cleanedPayload)

    const output = await runStepJson({
      systemPrompt: ADVANCED_SYSTEM_PROMPT,
      userPrompt: buildFinalPolishPrompt(cleanedPayload, assembledScript),
      temperature: 0.75,
    })
    const polishedScript = normalizeScriptOutput(output, assembledScript)
    validateCompleteScript(polishedScript, cleanedPayload)

    return {
      status: 'completed',
      progress: {
        ...progress,
        currentStep: 'completed',
        currentSectionIndex: sectionOrder.length,
        nextRetryAt: null,
        lastError: null,
      },
      result: polishedScript,
      error_message: null,
    }
  } catch (error) {
    console.error('[script-generation] polish step failed', { jobId: job.id, error })
    return buildFailureUpdate({ ...progress, currentStep: 'polish', currentSectionIndex: sectionOrder.length }, stepKey, error)
  }
}
