-- Create programs table to store program information
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  narrative_description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
