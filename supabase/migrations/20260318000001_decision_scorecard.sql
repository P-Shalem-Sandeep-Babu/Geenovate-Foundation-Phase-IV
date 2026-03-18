-- ========================================
-- Extend startup_ideas with review fields
-- ========================================
ALTER TABLE public.startup_ideas
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Update status enum check to include under_review
ALTER TABLE public.startup_ideas
DROP CONSTRAINT IF EXISTS startup_ideas_status_check;

ALTER TABLE public.startup_ideas
ADD CONSTRAINT startup_ideas_status_check
CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'));

-- ========================================
-- Extend startups with review fields
-- ========================================
ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- Create startup_scores table
-- ========================================
CREATE TABLE IF NOT EXISTS public.startup_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    innovation_score INTEGER NOT NULL CHECK (innovation_score BETWEEN 1 AND 10),
    market_score INTEGER NOT NULL CHECK (market_score BETWEEN 1 AND 10),
    execution_score INTEGER NOT NULL CHECK (execution_score BETWEEN 1 AND 10),
    team_score INTEGER NOT NULL CHECK (team_score BETWEEN 1 AND 10),
    total_score NUMERIC GENERATED ALWAYS AS (
        (innovation_score + market_score + execution_score + team_score)::numeric / 4
    ) STORED,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for startup_scores
ALTER TABLE public.startup_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view scores" ON public.startup_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can submit scores" ON public.startup_scores FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can update own scores" ON public.startup_scores FOR UPDATE USING (auth.uid() = reviewer_id);
