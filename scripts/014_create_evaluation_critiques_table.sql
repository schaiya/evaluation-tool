CREATE TABLE IF NOT EXISTS evaluation_critiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES avatars(id) ON DELETE CASCADE,
  critique_data JSONB NOT NULL DEFAULT '{}',
  overall_assessment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_critiques_program ON evaluation_critiques(program_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_critiques_program_avatar ON evaluation_critiques(program_id, avatar_id);
