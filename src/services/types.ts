export type ChannelContext = {
  channelProfile?: string
  audience?: string
  exampleChannels?: string[]
  userNotes?: string
  channelStyle?: string
  audiencePainPoints?: string
  niche: string
  videoTopicIdea: string
  targetAudience: string
  tone: string
  videoLength: string
  videoFormat: string
  channelName?: string
}

export type VideoIdea = {
  title: string
  concept: string
  why_it_works: string
  hook_angle: string
  click_score: 'high' | 'medium'
}

export type TitlePayload = {
  titles: string[]
}

export type OutlineSection = {
  section: string
  content: string
}

export type GeneratedScript = {
  script: {
    title: string
    sections: Array<{ section: string; text: string }>
  }
}

export type ScriptPolishRequest = {
  script: string
  mode: 'shorten' | 'expand' | 'retention' | 'simplify' | 'intensify'
}

export type ScriptPolishResponse = {
  polished_script: string
}
