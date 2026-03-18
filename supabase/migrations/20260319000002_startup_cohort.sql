-- Add cohort_id to startups if it doesn't exist to support Cohort Enrollment
ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL;
