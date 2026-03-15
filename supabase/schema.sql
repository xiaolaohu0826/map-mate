-- MapMate: markers table
create table if not exists public.markers (
  id          uuid primary key default gen_random_uuid(),
  lat         double precision not null,
  lng         double precision not null,
  style       text not null check (style in ('dart', 'pin', 'heart')),
  note        text not null default '',
  created_at  timestamptz not null default now()
);

-- Enable Row Level Security (open read/write for now, tighten later)
alter table public.markers enable row level security;

create policy "allow all" on public.markers
  for all using (true) with check (true);
