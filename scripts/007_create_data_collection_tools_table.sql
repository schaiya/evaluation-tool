-- Create data collection tools table
create table if not exists public.data_collection_tools (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null,
  tool_type text not null check (tool_type in ('survey', 'interview', 'focus_group', 'observation', 'other')),
  tool_name text not null,
  tool_content jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
