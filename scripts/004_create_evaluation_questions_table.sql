-- Create evaluation questions table
create table if not exists public.evaluation_questions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null,
  question text not null,
  is_ai_generated boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
