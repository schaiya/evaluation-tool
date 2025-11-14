-- Add name column to programs table (making it required)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Program';

-- Update existing programs to use title as name if title exists
UPDATE programs SET name = title WHERE title IS NOT NULL AND name = 'Untitled Program';

-- Drop the title column since we're using name now
ALTER TABLE programs DROP COLUMN IF EXISTS title;

-- Setup CASCADE DELETE for all related tables to enable full program deletion
ALTER TABLE program_elements DROP CONSTRAINT IF EXISTS program_elements_program_id_fkey;
ALTER TABLE program_elements ADD CONSTRAINT program_elements_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE logic_models DROP CONSTRAINT IF EXISTS logic_models_program_id_fkey;
ALTER TABLE logic_models ADD CONSTRAINT logic_models_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE evaluation_questions DROP CONSTRAINT IF EXISTS evaluation_questions_program_id_fkey;
ALTER TABLE evaluation_questions ADD CONSTRAINT evaluation_questions_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE indicators DROP CONSTRAINT IF EXISTS indicators_program_id_fkey;
ALTER TABLE indicators ADD CONSTRAINT indicators_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE evaluation_plans DROP CONSTRAINT IF EXISTS evaluation_plans_program_id_fkey;
ALTER TABLE evaluation_plans ADD CONSTRAINT evaluation_plans_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE data_collection_tools DROP CONSTRAINT IF EXISTS data_collection_tools_program_id_fkey;
ALTER TABLE data_collection_tools ADD CONSTRAINT data_collection_tools_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE uploaded_data DROP CONSTRAINT IF EXISTS uploaded_data_program_id_fkey;
ALTER TABLE uploaded_data ADD CONSTRAINT uploaded_data_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_program_id_fkey;
ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_program_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE element_connections DROP CONSTRAINT IF EXISTS element_connections_program_id_fkey;
ALTER TABLE element_connections ADD CONSTRAINT element_connections_program_id_fkey 
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
