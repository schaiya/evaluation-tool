-- Add flavor attribution columns to evaluation_questions table
ALTER TABLE evaluation_questions 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'ai_generated',
ADD COLUMN IF NOT EXISTS source_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS audience_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS approach_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS standard_tags TEXT[] DEFAULT '{}';

-- source_type can be: 'ai_generated', 'custom', 'funder_rfp', 'standard'
-- source_details stores additional context like:
--   {"standard": "CDC", "principle": "Engage Stakeholders"}
--   {"funder": "Robert Wood Johnson Foundation", "requirement": "outcome evaluation"}
--   {"approach": "Utilization-Focused", "avatar": "Michael Patton"}
-- audience_tags: ['funder', 'internal', 'community']
-- approach_tags: ['utilization-focused', 'participatory']
-- standard_tags: ['AEA', 'CREA']

COMMENT ON COLUMN evaluation_questions.source_type IS 'Origin of the question: ai_generated, custom, funder_rfp, standard';
COMMENT ON COLUMN evaluation_questions.source_details IS 'JSON with attribution details like standard name, funder, approach, avatar';
COMMENT ON COLUMN evaluation_questions.audience_tags IS 'Array of audience types this question serves';
COMMENT ON COLUMN evaluation_questions.approach_tags IS 'Array of evaluation approaches this question aligns with';
COMMENT ON COLUMN evaluation_questions.standard_tags IS 'Array of evaluation standards this question relates to';
