-- Create evaluation_flavors table (main flavor config per program)
CREATE TABLE IF NOT EXISTS evaluation_flavors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  funder_name TEXT,
  funder_guidelines_url TEXT,
  custom_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(program_id)
);

-- Create flavor_audiences table (selected audiences, many per flavor)
CREATE TABLE IF NOT EXISTS flavor_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flavor_id UUID NOT NULL REFERENCES evaluation_flavors(id) ON DELETE CASCADE,
  audience_type TEXT NOT NULL,
  custom_name TEXT,
  custom_description TEXT,
  priority INTEGER DEFAULT 1,
  preferred_evidence TEXT[],
  preferred_methods TEXT[],
  reporting_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flavor_approaches table (selected evaluation theories)
CREATE TABLE IF NOT EXISTS flavor_approaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flavor_id UUID NOT NULL REFERENCES evaluation_flavors(id) ON DELETE CASCADE,
  approach_type TEXT NOT NULL,
  custom_name TEXT,
  custom_description TEXT,
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evaluation_standards table (reference database - pre-populated)
CREATE TABLE IF NOT EXISTS evaluation_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_name TEXT NOT NULL,
  category TEXT NOT NULL,
  content JSONB NOT NULL,
  source_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create funder_requirements table (extracted from uploaded RFPs)
CREATE TABLE IF NOT EXISTS funder_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flavor_id UUID NOT NULL REFERENCES evaluation_flavors(id) ON DELETE CASCADE,
  source_filename TEXT,
  evaluation_requirements TEXT[],
  reporting_templates TEXT[],
  timeline_expectations TEXT,
  required_metrics TEXT[],
  raw_extraction JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evaluation_flavors_program_id ON evaluation_flavors(program_id);
CREATE INDEX IF NOT EXISTS idx_flavor_audiences_flavor_id ON flavor_audiences(flavor_id);
CREATE INDEX IF NOT EXISTS idx_flavor_approaches_flavor_id ON flavor_approaches(flavor_id);
CREATE INDEX IF NOT EXISTS idx_flavor_approaches_avatar_id ON flavor_approaches(avatar_id);
CREATE INDEX IF NOT EXISTS idx_funder_requirements_flavor_id ON funder_requirements(flavor_id);

-- Insert baseline evaluation standards (AEA, CDC, EEA, CREA)
INSERT INTO evaluation_standards (standard_name, category, content, source_url) VALUES
(
  'AEA',
  'competency',
  '{
    "name": "American Evaluation Association Competencies",
    "domains": [
      {
        "name": "Professional Practice",
        "principles": ["Act ethically", "Respect stakeholders", "Consider context and culture"]
      },
      {
        "name": "Methodology",
        "principles": ["Use appropriate methods", "Ensure data quality", "Analyze systematically"]
      },
      {
        "name": "Context",
        "principles": ["Understand program context", "Consider political dynamics", "Attend to stakeholder needs"]
      },
      {
        "name": "Planning and Management",
        "principles": ["Define scope clearly", "Manage resources", "Document processes"]
      },
      {
        "name": "Interpersonal",
        "principles": ["Communicate effectively", "Build relationships", "Facilitate learning"]
      }
    ],
    "evidence_preferences": ["mixed_methods", "stakeholder_input", "contextual_analysis"],
    "reporting_emphasis": ["utilization", "stakeholder_engagement", "actionable_findings"]
  }',
  'https://www.eval.org/About/Competencies-Standards'
),
(
  'CDC',
  'framework',
  '{
    "name": "CDC Framework for Program Evaluation",
    "steps": [
      {"step": 1, "name": "Engage Stakeholders", "description": "Identify and involve those with interest in the evaluation"},
      {"step": 2, "name": "Describe the Program", "description": "Define the program mission, goals, and logic model"},
      {"step": 3, "name": "Focus the Evaluation Design", "description": "Determine purpose, users, uses, questions, methods"},
      {"step": 4, "name": "Gather Credible Evidence", "description": "Collect data using appropriate indicators and sources"},
      {"step": 5, "name": "Justify Conclusions", "description": "Link findings to evidence using standards"},
      {"step": 6, "name": "Ensure Use and Share Lessons", "description": "Prepare and disseminate findings for use"}
    ],
    "standards": ["utility", "feasibility", "propriety", "accuracy"],
    "evidence_preferences": ["quantitative_outcomes", "process_data", "stakeholder_perspectives"],
    "reporting_emphasis": ["public_health_impact", "evidence_based_practice", "continuous_improvement"]
  }',
  'https://www.cdc.gov/evaluation/framework/index.htm'
),
(
  'EEA',
  'competency',
  '{
    "name": "European Evaluation Society Competencies",
    "domains": [
      {
        "name": "Professional Practice",
        "principles": ["Independence and impartiality", "Transparency", "Competence"]
      },
      {
        "name": "Systematic Inquiry",
        "principles": ["Rigorous methodology", "Evidence-based conclusions", "Quality assurance"]
      },
      {
        "name": "Integrity and Honesty",
        "principles": ["Accurate reporting", "Disclosure of limitations", "Conflict of interest management"]
      },
      {
        "name": "Respect for People",
        "principles": ["Informed consent", "Confidentiality", "Cultural sensitivity"]
      }
    ],
    "evidence_preferences": ["theory_based", "comparative_analysis", "longitudinal_data"],
    "reporting_emphasis": ["policy_relevance", "cross_national_learning", "methodological_rigor"]
  }',
  'https://europeanevaluation.org/'
),
(
  'CREA',
  'framework',
  '{
    "name": "Culturally Responsive Evaluation and Assessment",
    "principles": [
      {"name": "Cultural Context", "description": "Ground evaluation in cultural context of participants and communities"},
      {"name": "Community Self-Determination", "description": "Support community ownership and decision-making in evaluation"},
      {"name": "Multiple Ways of Knowing", "description": "Honor diverse epistemologies and knowledge systems"},
      {"name": "Power Dynamics", "description": "Attend to historical and systemic power imbalances"},
      {"name": "Capacity Building", "description": "Build evaluation capacity within communities"}
    ],
    "key_questions": [
      "Whose voices are centered?",
      "How is culture defined and by whom?",
      "What historical context shapes this program?",
      "How will findings benefit the community?"
    ],
    "evidence_preferences": ["community_voice", "qualitative_narratives", "participatory_methods", "indigenous_methodologies"],
    "reporting_emphasis": ["community_benefit", "cultural_validity", "actionable_recommendations", "accessible_formats"]
  }',
  'https://www.crea.arizona.edu/'
)
ON CONFLICT DO NOTHING;
