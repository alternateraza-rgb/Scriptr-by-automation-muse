alter table public.scripts
  add column if not exists content_pillars text,
  add column if not exists example_channels text,
  add column if not exists topic_focus text,
  add column if not exists user_notes text,
  add column if not exists video_length text,
  add column if not exists generated_ideas text;

update public.channel_profiles
set
  content_pillars = null,
  example_channels = null,
  video_length = null,
  topic_focus = null,
  user_notes = null;
