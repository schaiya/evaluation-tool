ALTER TABLE evaluation_critiques 
ADD COLUMN IF NOT EXISTS overall_stance TEXT DEFAULT 'partial' CHECK (overall_stance IN ('agree', 'partial', 'disagree'));
