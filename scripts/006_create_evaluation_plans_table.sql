-- Create evaluation plans table
create table if not exists public.evaluation_plans (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null unique,
  start_date date,
  end_date date,
  duration_months integer,
  plan_data jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
