alter table public.channel_profiles
  add column if not exists profile_source text not null default 'manual',
  add column if not exists youtube_channel_url text,
  add column if not exists youtube_channel_id text,
  add column if not exists channel_avatar_url text,
  add column if not exists subscriber_count bigint;

create index if not exists channel_profiles_profile_source_idx
  on public.channel_profiles (user_id, profile_source);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'channel_profiles'
      and column_name = 'youtube_profile_photo_url'
  ) then
    execute '
      update public.channel_profiles
      set channel_avatar_url = coalesce(channel_avatar_url, youtube_profile_photo_url)
      where channel_avatar_url is null
        and youtube_profile_photo_url is not null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'channel_profiles'
      and column_name = 'youtube_subscriber_count'
  ) then
    execute '
      update public.channel_profiles
      set subscriber_count = coalesce(subscriber_count, youtube_subscriber_count)
      where subscriber_count is null
        and youtube_subscriber_count is not null
    ';
  end if;
end $$;
