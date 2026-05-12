-- StartShield persistent memory schema
-- Run this in Supabase SQL Editor after creating the project.

create table if not exists public.startshield_memory (
    id uuid primary key default gen_random_uuid(),
    device_id text not null,
    memory_key text not null,
    memory_value jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (device_id, memory_key)
);

alter table public.startshield_memory enable row level security;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_startshield_memory_updated_at on public.startshield_memory;

create trigger set_startshield_memory_updated_at
before update on public.startshield_memory
for each row
execute function public.set_current_timestamp_updated_at();

create policy "Read memory for current device"
on public.startshield_memory
for select
to anon
using (
    device_id = current_setting('request.headers', true)::jsonb ->> 'x-startshield-device-id'
);

create policy "Insert memory for current device"
on public.startshield_memory
for insert
to anon
with check (
    device_id = current_setting('request.headers', true)::jsonb ->> 'x-startshield-device-id'
);

create policy "Update memory for current device"
on public.startshield_memory
for update
to anon
using (
    device_id = current_setting('request.headers', true)::jsonb ->> 'x-startshield-device-id'
)
with check (
    device_id = current_setting('request.headers', true)::jsonb ->> 'x-startshield-device-id'
);
