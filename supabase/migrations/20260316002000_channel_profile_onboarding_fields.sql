alter table public.channel_profiles
  add column if not exists age_range text,
  add column if not exists upload_frequency text;
