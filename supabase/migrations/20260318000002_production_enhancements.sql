-- ================================================================
-- Production Enhancement Migration
-- ================================================================

-- 1. Activity Logs table for incubation-specific events
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('idea', 'startup', 'task', 'pitch', 'score', 'funding')),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view activity logs" ON public.activity_logs
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Prevent duplicate idea titles per user
ALTER TABLE public.startup_ideas
    DROP CONSTRAINT IF EXISTS startup_ideas_user_id_title_unique;
ALTER TABLE public.startup_ideas
    ADD CONSTRAINT startup_ideas_user_id_title_unique UNIQUE (user_id, title);

-- 3. Tighten RLS for startup_ideas 
-- Users can only see their own ideas (non-admins)
-- Admins can see all via existing auth role checks
DROP POLICY IF EXISTS "Authenticated users can read startup_ideas" ON public.startup_ideas;
CREATE POLICY "Users can read own ideas, admins read all" ON public.startup_ideas
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'category_admin')
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert startup_ideas" ON public.startup_ideas;
CREATE POLICY "Authenticated users can insert own ideas" ON public.startup_ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update startup_ideas" ON public.startup_ideas;
CREATE POLICY "Admins can update ideas" ON public.startup_ideas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'category_admin')
        )
    );

-- 4. Tighten startup_scores RLS
-- Only the reviewer or admins can delete scores
DROP POLICY IF EXISTS "Reviewers can update own scores" ON public.startup_scores;
CREATE POLICY "Mentor or admin can update scores" ON public.startup_scores
    FOR UPDATE USING (
        auth.uid() = reviewer_id OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- 5. Ensure startup_pitches has proper RLS
ALTER TABLE public.startup_pitches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view pitches" ON public.startup_pitches;
CREATE POLICY "Authenticated can view pitches" ON public.startup_pitches
    FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can insert pitches" ON public.startup_pitches;
CREATE POLICY "Authenticated can insert pitches" ON public.startup_pitches
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can update pitches" ON public.startup_pitches;
CREATE POLICY "Admins can update pitches" ON public.startup_pitches
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'category_admin'))
    );
