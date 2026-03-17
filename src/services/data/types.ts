export type ProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  email: string
  created_at: string
  updated_at: string
}

export type OnboardingResponseRow = {
  id: string
  user_id: string
  niche: string | null
  income_goal: string | null
  channel_stage: string | null
  content_style: string | null
  audience: string | null
  channel_name: string | null
  upload_frequency: string | null
  tone: string | null
  age_range: string | null
  level: string | null
  pain_points: string | null
  primary_goal: string | null
  custom_niche: string | null
  custom_tone: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ChannelProfileRow = {
  id: string
  user_id: string
  channel_name: string
  niche: string | null
  audience: string | null
  age_range: string | null
  tone: string | null
  upload_frequency: string | null
  video_length: string | null
  video_format: string | null
  topic_focus: string | null
  target_audience: string | null
  channel_stage: string | null
  audience_knowledge_level: string | null
  audience_pain_points: string | null
  user_notes: string | null
  monetization_goal: string | null
  content_pillars: string | null
  example_channels: string | null
  is_default: boolean | null
  created_at: string
  updated_at: string
}

export type ScriptRow = {
  id: string
  user_id: string
  channel_profile_id: string | null
  title: string
  selected_title: string | null
  idea: string | null
  outline: string | null
  full_script: string | null
  status: string | null
  word_count: number | null
  niche: string | null
  tone: string | null
  content_pillars: string | null
  example_channels: string | null
  topic_focus: string | null
  user_notes: string | null
  video_length: string | null
  generated_ideas: string | null
  script_type: string | null
  favorite: boolean | null
  created_at: string
  updated_at: string
}

export type UsageStatsRow = {
  id: string
  user_id: string
  scripts_generated: number
  last_active_at: string | null
  created_at: string
  updated_at: string
}
