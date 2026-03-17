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
    monetizationGoal: string
    channelStyle: string
    audiencePainPoints: string
    contentPillars: string[]
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

You are a top-tier YouTube strategist and script writer for faceless channels.

You create high-retention, non-generic content based on real performance patterns.

You do not brainstorm randomly.
You analyze what works, avoid saturation, and generate strategic content ideas.

You write in a cinematic, engaging, narration-first style.
You avoid all generic AI phrasing and cliches.

You follow structure exactly.
You return valid JSON only.`

const sectionOrder = ['Hook', 'Curiosity Gap', 'Setup', 'Escalation', 'New Information', 'Mid Reset', 'Reveal', 'Payoff', 'CTA']

const PLACEHOLDER_MATCHES = ['audience profile not set yet', 'add inspiration channels', 'untitled channel']
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
      monetizationGoal: withFallback(cleanText(context.monetizationGoal), 'Build sustainable channel revenue with repeatable high-retention uploads'),
      channelStyle: withFallback(cleanText(context.channelStyle), 'Narration-first faceless storytelling'),
      audiencePainPoints: withFallback(
        cleanText(context.audiencePainPoints),
        `This audience wants ${niche.toLowerCase()} content with clear stakes and practical payoff.`,
      ),
      contentPillars: cleanList((context as { contentPillars?: unknown }).contentPillars),
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
  return `Cleaned variables:\n${JSON.stringify(payload.variables, null, 2)}

YouTube outlier research findings:\n${JSON.stringify(payload.youtubeOutlierResearch, null, 2)}

Selected idea:\n${JSON.stringify(payload.selectedIdea, null, 2)}

Master outline:\n${JSON.stringify(payload.masterOutline, null, 2)}

Exact section structure:\n${JSON.stringify(payload.sectionStructure, null, 2)}

Strict writing rules:
- Produce a cinematic, spoken, high-retention script with natural pacing.
- Tone control: follow tone exactly as provided in cleaned variables.
- Respect video length and keep total word count between ${lengthTargets.minimumWords} and ${lengthTargets.maximumWords} words.
- Target close to ${lengthTargets.targetWords} words.
- Use audiencePainPoints and contentPillars as direct narrative anchors.
- Keep consistency across idea, title, outline, and script.
- Do not use em dashes.
- No generic phrasing.
- No filler.
- No repetition.
- Never use these banned phrases: ${BANNED_PHRASES.join('; ')}.

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
- Keep tone, audiencePainPoints, and contentPillars aligned to cleaned variables.
- No generic phrasing and no em dashes.

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
      title,
      sections: sectionOrder.map((section) => ({
        section,
        text: sectionMap.get(section.toLowerCase()) || '',
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
      title: typeof correctedScript.title === 'string' && correctedScript.title.trim() ? correctedScript.title.trim() : normalizedScript.script.title,
      sections: sectionOrder.map((section) => ({
        section,
        text: correctedMap.get(section.toLowerCase()) || normalizedScript.script.sections.find((item) => item.section === section)?.text || '',
      })),
    },
  }
}
