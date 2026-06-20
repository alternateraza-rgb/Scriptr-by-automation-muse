create table if not exists public.script_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'generating', 'completed', 'failed')),
  request_payload jsonb not null,
  progress jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists script_generation_jobs_user_updated_idx
on public.script_generation_jobs (user_id, updated_at desc);

drop trigger if exists script_generation_jobs_set_updated_at on public.script_generation_jobs;
create trigger script_generation_jobs_set_updated_at before update on public.script_generation_jobs
for each row execute function public.set_updated_at();

alter table public.script_generation_jobs enable row level security;

drop policy if exists "script_generation_jobs_owner_all" on public.script_generation_jobs;
create policy "script_generation_jobs_owner_all" on public.script_generation_jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
