-- Create `startup_ideas` table
CREATE TABLE IF NOT EXISTS public.startup_ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT NOT NULL,
    domain TEXT,
    stage TEXT CHECK (stage IN ('idea', 'validation', 'prototype')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for startup_ideas
ALTER TABLE public.startup_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all ideas" ON public.startup_ideas FOR SELECT USING (true);
CREATE POLICY "Users can insert own ideas" ON public.startup_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin/Mentor can update ideas" ON public.startup_ideas FOR UPDATE USING (auth.role() = 'authenticated');

-- Alter the `startups` table to add new tracking fields
ALTER TABLE public.startups 
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'idea' CHECK (stage IN ('idea', 'validation', 'prototype', 'mvp', 'scaling')),
ADD COLUMN IF NOT EXISTS funding_received NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS funding_type TEXT CHECK (funding_type IN ('grant', 'investment', 'internal support', null)),
ADD COLUMN IF NOT EXISTS support_notes TEXT;

-- Create `startup_pitches` table
CREATE TABLE IF NOT EXISTS public.startup_pitches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pitch_link TEXT NOT NULL,
    demo_date TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for startup_pitches
ALTER TABLE public.startup_pitches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pitches" ON public.startup_pitches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pitches" ON public.startup_pitches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update pitches" ON public.startup_pitches FOR UPDATE USING (auth.role() = 'authenticated');
