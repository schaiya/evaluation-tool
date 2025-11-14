-- Create uploaded data table
create table if not exists public.uploaded_data (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null,
  file_name text not null,
  file_type text not null,
  data_content jsonb not null,
  uploaded_at timestamp with time zone default now()
);

-- Create analysis results table
create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null,
  analysis_type text not null,
  analysis_plan jsonb,
  results jsonb not null,
  created_at timestamp with time zone default now()
);

-- Create reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade not null unique,
  report_content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
