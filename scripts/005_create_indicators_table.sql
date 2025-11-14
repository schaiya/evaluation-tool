-- Create indicators table
create table if not exists public.indicators (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null,
  question_id uuid references public.evaluation_questions(id) on delete cascade,
  indicator_text text not null,
  metric text,
  data_source text,
  is_selected boolean default false,
  is_ai_generated boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
