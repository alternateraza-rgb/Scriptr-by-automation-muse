alter table public.channel_profiles
  add column if not exists profile_source text not null default 'manual',
  add column if not exists youtube_channel_url text,
  add column if not exists youtube_channel_id text,
  add column if not exists youtube_subscriber_count bigint,
  add column if not exists youtube_profile_photo_url text,
  add column if not exists youtube_description text;

create index if not exists channel_profiles_profile_source_idx
  on public.channel_profiles (user_id, profile_source);
