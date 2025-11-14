-- Fix the element_type check constraint to allow all outcome types
-- Drop the old constraint
ALTER TABLE public.program_elements DROP CONSTRAINT IF EXISTS program_elements_element_type_check;

-- Add the correct constraint with all allowed values
ALTER TABLE public.program_elements 
ADD CONSTRAINT program_elements_element_type_check 
CHECK (element_type IN ('input', 'activity', 'short_term_outcome', 'mid_term_outcome', 'long_term_outcome', 'impact'));
