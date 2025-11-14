-- Create program elements table for inputs, activities, outcomes, and impacts
create table if not exists public.program_elements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null,
  element_type text not null check (element_type in ('input', 'activity', 'short_term_outcome', 'mid_term_outcome', 'long_term_outcome', 'impact')),
  content text not null,
  position integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
