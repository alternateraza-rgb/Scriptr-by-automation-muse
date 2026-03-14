export type ChannelContext = {
  niche: string
  videoTopicIdea: string
  targetAudience: string
  tone: string
  videoLength: string
  videoFormat: string
  monetizationGoal: string
  channelStage: string
  channelName?: string
}

export type VideoIdea = {
  title: string
  concept: string
  why_it_works: string
  hook_angle: string
  thumbnail_text: string
  click_score: number
}

export type HookTitlePayload = {
  titles: string[]
}

export type OutlineSection = {
  id: string
  title: string
  text: string
  locked?: boolean
}

export type GeneratedScript = {
  title: string
  thumbnail_text: string
  hook: string
  intro: string
  body_sections: Array<{ heading: string; content: string }>
  cta: string
  conclusion: string
}

export type ScriptPolishRequest = {
  script: GeneratedScript
  command: string
}

export type ScriptPolishResponse = {
  script: GeneratedScript
  assistant_reply: string
}
