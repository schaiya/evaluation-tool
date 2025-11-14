-- Create logic model table for storing visual diagram data
create table if not exists public.logic_models (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null unique,
  diagram_data jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
