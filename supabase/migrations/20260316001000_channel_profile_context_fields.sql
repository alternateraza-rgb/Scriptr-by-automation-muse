alter table public.channel_profiles
  add column if not exists video_format text,
  add column if not exists topic_focus text,
  add column if not exists target_audience text,
  add column if not exists channel_stage text,
  add column if not exists audience_knowledge_level text,
  add column if not exists audience_pain_points text,
  add column if not exists user_notes text;
