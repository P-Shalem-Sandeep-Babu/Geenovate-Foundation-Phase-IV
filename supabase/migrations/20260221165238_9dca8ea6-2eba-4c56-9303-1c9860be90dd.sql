
-- =============================================
-- PERMISSIONS-BASED RBAC SYSTEM
-- =============================================

-- Create permissions table
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  module text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- COHORT MEMBERS (every user belongs to exactly one cohort)
-- =============================================
CREATE TABLE public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TASKS
-- =============================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  assigned_category category_type,
  cohort_id uuid REFERENCES public.cohorts(id),
  deadline timestamptz,
  completed_at timestamptz,
  approved_by_ceo boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TASK COMMENTS
-- =============================================
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- WEEKLY UPDATES
-- =============================================
CREATE TABLE public.weekly_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cohort_id uuid REFERENCES public.cohorts(id),
  week_start date NOT NULL,
  work_completed text NOT NULL,
  challenges text,
  next_goals text NOT NULL,
  support_needed text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
ALTER TABLE public.weekly_updates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- COHORT FILES
-- =============================================
CREATE TABLE public.cohort_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  description text,
  uploaded_by uuid NOT NULL,
  is_important boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cohort_files ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PERFORMANCE SCORES
-- =============================================
CREATE TABLE public.performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cohort_id uuid REFERENCES public.cohorts(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  task_score numeric(5,2) NOT NULL DEFAULT 0,
  update_score numeric(5,2) NOT NULL DEFAULT 0,
  attendance_score numeric(5,2) NOT NULL DEFAULT 0,
  overall_score numeric(5,2) NOT NULL DEFAULT 0,
  is_at_risk boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION: check permission
-- =============================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = _permission
  ) OR public.is_super_admin()
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- permissions: viewable by authenticated, managed by super_admin
CREATE POLICY "Authenticated view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages permissions" ON public.permissions FOR ALL USING (is_super_admin());

-- role_permissions: viewable by authenticated, managed by super_admin
CREATE POLICY "Authenticated view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages role_permissions" ON public.role_permissions FOR ALL USING (is_super_admin());

-- cohort_members: users see own, super_admin sees all
CREATE POLICY "Users view own cohort membership" ON public.cohort_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY "Super admin manages cohort_members" ON public.cohort_members FOR ALL USING (is_super_admin());

-- tasks: assigned user or super_admin
CREATE POLICY "Users view assigned tasks" ON public.tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR created_by = auth.uid() OR is_super_admin());
CREATE POLICY "Users update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid() OR is_super_admin());
CREATE POLICY "Super admin manages tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (is_super_admin() OR has_permission(auth.uid(), 'tasks.create'));
CREATE POLICY "Super admin deletes tasks" ON public.tasks FOR DELETE TO authenticated USING (is_super_admin());

-- task_comments
CREATE POLICY "View task comments" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create task comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Super admin deletes comments" ON public.task_comments FOR DELETE TO authenticated USING (is_super_admin());

-- weekly_updates: users see own, super_admin sees all
CREATE POLICY "Users view own updates" ON public.weekly_updates FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY "Users create own updates" ON public.weekly_updates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own updates" ON public.weekly_updates FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- cohort_files: cohort members + super_admin
CREATE POLICY "View cohort files" ON public.cohort_files FOR SELECT TO authenticated USING (
  is_super_admin() OR (NOT restricted AND EXISTS (SELECT 1 FROM public.cohort_members cm WHERE cm.cohort_id = cohort_files.cohort_id AND cm.user_id = auth.uid()))
);
CREATE POLICY "Upload cohort files" ON public.cohort_files FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.cohort_members cm WHERE cm.cohort_id = cohort_files.cohort_id AND cm.user_id = auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.cohorts c WHERE c.id = cohort_files.cohort_id AND c.is_archived = true)
);
CREATE POLICY "Super admin manages cohort files" ON public.cohort_files FOR DELETE TO authenticated USING (is_super_admin());

-- performance_scores: users see own, super_admin sees all
CREATE POLICY "Users view own scores" ON public.performance_scores FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY "Super admin manages scores" ON public.performance_scores FOR ALL USING (is_super_admin());

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- SEED DEFAULT PERMISSIONS
-- =============================================
INSERT INTO public.permissions (name, description, module) VALUES
  ('users.view', 'View user profiles', 'users'),
  ('users.create', 'Create new users', 'users'),
  ('users.update', 'Update user profiles', 'users'),
  ('users.delete', 'Delete users', 'users'),
  ('users.manage_roles', 'Assign/remove roles', 'users'),
  ('cohorts.view', 'View cohorts', 'cohorts'),
  ('cohorts.create', 'Create cohorts', 'cohorts'),
  ('cohorts.update', 'Update cohorts', 'cohorts'),
  ('cohorts.archive', 'Archive/restore cohorts', 'cohorts'),
  ('tasks.view', 'View tasks', 'tasks'),
  ('tasks.create', 'Create tasks', 'tasks'),
  ('tasks.update', 'Update tasks', 'tasks'),
  ('tasks.approve', 'Approve task completion', 'tasks'),
  ('announcements.view', 'View announcements', 'announcements'),
  ('announcements.create', 'Create announcements', 'announcements'),
  ('announcements.approve', 'Approve announcements', 'announcements'),
  ('gallery.view', 'View gallery', 'gallery'),
  ('gallery.upload', 'Upload to gallery', 'gallery'),
  ('gallery.approve', 'Approve gallery items', 'gallery'),
  ('weekly_updates.view', 'View weekly updates', 'weekly_updates'),
  ('weekly_updates.submit', 'Submit weekly updates', 'weekly_updates'),
  ('performance.view', 'View performance scores', 'performance'),
  ('performance.manage', 'Manage performance scoring', 'performance'),
  ('audit.view', 'View audit logs', 'audit'),
  ('config.manage', 'Manage system config', 'config'),
  ('files.upload', 'Upload cohort files', 'files'),
  ('files.delete', 'Delete cohort files', 'files'),
  ('files.manage', 'Manage file access', 'files');

-- Assign all permissions to super_admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions;

-- Assign relevant permissions to category_admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'category_admin', id FROM public.permissions WHERE name IN (
  'users.view', 'cohorts.view', 'tasks.view', 'tasks.create', 'tasks.update',
  'announcements.view', 'announcements.create', 'gallery.view', 'gallery.upload',
  'weekly_updates.view', 'performance.view', 'files.upload'
);

-- Assign member permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'member', id FROM public.permissions WHERE name IN (
  'cohorts.view', 'tasks.view', 'announcements.view', 'gallery.view',
  'weekly_updates.view', 'weekly_updates.submit', 'performance.view', 'files.upload'
);

-- Assign viewer permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer', id FROM public.permissions WHERE name IN (
  'cohorts.view', 'tasks.view', 'announcements.view', 'gallery.view',
  'weekly_updates.view', 'performance.view'
);

-- =============================================
-- ADD STORAGE BUCKET FOR COHORT FILES
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('cohort-files', 'cohort-files', false);

CREATE POLICY "Authenticated upload cohort files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cohort-files');

CREATE POLICY "Authenticated read cohort files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'cohort-files');

CREATE POLICY "Super admin delete cohort files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cohort-files' AND public.is_super_admin());
