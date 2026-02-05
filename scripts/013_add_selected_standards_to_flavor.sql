-- Add selected_standard_ids column to evaluation_flavors table
ALTER TABLE evaluation_flavors 
ADD COLUMN IF NOT EXISTS selected_standard_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN evaluation_flavors.selected_standard_ids IS 'Array of evaluation_standards IDs that the user has selected to apply to this evaluation';
