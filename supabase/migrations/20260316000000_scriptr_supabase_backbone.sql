-- Enable UUID generator
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Onboarding responses
create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  niche text,
  income_goal text,
  channel_stage text,
  content_style text,
  audience text,
  channel_name text,
  upload_frequency text,
  tone text,
  age_range text,
  level text,
  pain_points text,
  primary_goal text,
  custom_niche text,
  custom_tone text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Channel profiles
create table if not exists public.channel_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_name text not null,
  niche text,
  audience text,
  tone text,
  video_length text,
  monetization_goal text,
  content_pillars text,
  example_channels text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists channel_profiles_default_unique
on public.channel_profiles (user_id)
where is_default = true;

-- Scripts
create table if not exists public.scripts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_profile_id uuid references public.channel_profiles(id) on delete set null,
  title text not null,
  selected_title text,
  idea text,
  outline text,
  full_script text,
  status text,
  word_count int,
  niche text,
  tone text,
  script_type text,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usage stats
create table if not exists public.usage_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  scripts_generated int not null default 0,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists onboarding_responses_set_updated_at on public.onboarding_responses;
create trigger onboarding_responses_set_updated_at before update on public.onboarding_responses
for each row execute function public.set_updated_at();

drop trigger if exists channel_profiles_set_updated_at on public.channel_profiles;
create trigger channel_profiles_set_updated_at before update on public.channel_profiles
for each row execute function public.set_updated_at();

drop trigger if exists scripts_set_updated_at on public.scripts;
create trigger scripts_set_updated_at before update on public.scripts
for each row execute function public.set_updated_at();

drop trigger if exists usage_stats_set_updated_at on public.usage_stats;
create trigger usage_stats_set_updated_at before update on public.usage_stats
for each row execute function public.set_updated_at();

-- Row-level security
alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.channel_profiles enable row level security;
alter table public.scripts enable row level security;
alter table public.usage_stats enable row level security;

-- Policies
create policy "profiles_owner_all" on public.profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "onboarding_owner_all" on public.onboarding_responses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "channel_profiles_owner_all" on public.channel_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scripts_owner_all" on public.scripts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usage_stats_owner_all" on public.usage_stats
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
