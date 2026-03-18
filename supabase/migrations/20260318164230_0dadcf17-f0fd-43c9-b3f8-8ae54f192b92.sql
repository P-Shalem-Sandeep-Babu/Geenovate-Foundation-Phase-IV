
-- ============================================================
-- EXTEND cohorts table with new fields
-- ============================================================
ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS skills TEXT,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS mentor_id UUID;

-- ============================================================
-- TASKS TABLE — add proof_url if not exists
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- ============================================================
-- SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  submission_link TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions or admin" ON public.submissions
  FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Users can insert own submissions" ON public.submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own submissions" ON public.submissions
  FOR UPDATE USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Admin can delete submissions" ON public.submissions
  FOR DELETE USING (is_super_admin());

-- ============================================================
-- SUBMISSION FEEDBACK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submission_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL,
  comment TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view feedback" ON public.submission_feedback
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Mentor or admin can insert feedback" ON public.submission_feedback
  FOR INSERT WITH CHECK (mentor_id = auth.uid() OR is_super_admin());

CREATE POLICY "Mentor or admin can update feedback" ON public.submission_feedback
  FOR UPDATE USING (mentor_id = auth.uid() OR is_super_admin());

CREATE POLICY "Admin can delete feedback" ON public.submission_feedback
  FOR DELETE USING (is_super_admin());

-- ============================================================
-- RESOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf','link','video')),
  url TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view resources" ON public.resources
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert resources" ON public.resources
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "Admin can update resources" ON public.resources
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "Admin can delete resources" ON public.resources
  FOR DELETE USING (is_super_admin());

-- ============================================================
-- STARTUPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','building','launched')),
  created_by UUID,
  mentor_id UUID,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view startups" ON public.startups
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert startups" ON public.startups
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "Admin can update startups" ON public.startups
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "Admin can delete startups" ON public.startups
  FOR DELETE USING (is_super_admin());

CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STARTUP MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (startup_id, user_id)
);

ALTER TABLE public.startup_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view startup_members" ON public.startup_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage startup_members" ON public.startup_members
  FOR ALL USING (is_super_admin());

-- ============================================================
-- STARTUP TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view startup_tasks" ON public.startup_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage startup_tasks" ON public.startup_tasks
  FOR ALL USING (is_super_admin());

CREATE TRIGGER update_startup_tasks_updated_at
  BEFORE UPDATE ON public.startup_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STARTUP SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.startup_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  submission_link TEXT NOT NULL,
  submitted_by UUID,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view startup_submissions" ON public.startup_submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage startup_submissions" ON public.startup_submissions
  FOR ALL USING (is_super_admin());

-- ============================================================
-- ACTIVITY LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view activity_log" ON public.activity_log
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Auth can insert activity_log" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','deadline','success')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Admin can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR is_super_admin());
