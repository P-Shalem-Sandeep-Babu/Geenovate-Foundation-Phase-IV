
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'category_admin', 'member', 'viewer');

-- 2. Create user status enum
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended', 'alumni');

-- 3. Create category enum
CREATE TYPE public.category_type AS ENUM ('startups', 'innovation_associates', 'catalysts');

-- 4. Create priority enum
CREATE TYPE public.announcement_priority AS ENUM ('high', 'medium', 'low');

-- 5. Create visibility enum
CREATE TYPE public.visibility_type AS ENUM ('public', 'internal', 'category', 'cohort');

-- ========== BASE TABLES ==========

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  category public.category_type,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles!)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Cohorts table
CREATE TABLE public.cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  visibility public.visibility_type NOT NULL DEFAULT 'internal',
  priority public.announcement_priority NOT NULL DEFAULT 'medium',
  approved_by_ceo BOOLEAN NOT NULL DEFAULT false,
  is_sticky BOOLEAN NOT NULL DEFAULT false,
  target_category public.category_type,
  target_cohort_id UUID REFERENCES public.cohorts(id),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Team members (public display)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  category public.category_type,
  display_order INTEGER NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Impact metrics
CREATE TABLE public.impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

-- Gallery items
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  approved_by_ceo BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Audit logs (CEO only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- System config (CEO only)
CREATE TABLE public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- ========== HELPER FUNCTIONS ==========

-- Check if user has a specific role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_cohorts_updated_at BEFORE UPDATE ON public.cohorts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_impact_metrics_updated_at BEFORE UPDATE ON public.impact_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== RLS POLICIES ==========

-- Profiles: users see own, super_admin sees all, public sees nothing
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Super admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_super_admin());

-- User roles: user sees own roles, super_admin sees all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "Super admin manages roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_super_admin());

-- Cohorts: authenticated can read, super_admin can write
CREATE POLICY "Authenticated can view cohorts" ON public.cohorts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages cohorts" ON public.cohorts FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates cohorts" ON public.cohorts FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes cohorts" ON public.cohorts FOR DELETE TO authenticated USING (public.is_super_admin());

-- Announcements: public sees approved public ones, authenticated sees internal
CREATE POLICY "Public can view approved announcements" ON public.announcements FOR SELECT TO anon USING (visibility = 'public' AND approved_by_ceo = true AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Authenticated can view announcements" ON public.announcements FOR SELECT TO authenticated USING (public.is_super_admin() OR visibility = 'public' AND approved_by_ceo = true OR visibility = 'internal');
CREATE POLICY "Super admin manages announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes announcements" ON public.announcements FOR DELETE TO authenticated USING (public.is_super_admin());

-- Team members: public sees approved public ones
CREATE POLICY "Public can view approved team" ON public.team_members FOR SELECT TO anon USING (visibility = 'public' AND approved_by_ceo = true);
CREATE POLICY "Authenticated can view team" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages team" ON public.team_members FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates team" ON public.team_members FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes team" ON public.team_members FOR DELETE TO authenticated USING (public.is_super_admin());

-- Impact metrics: public can read all
CREATE POLICY "Public can view metrics" ON public.impact_metrics FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view metrics" ON public.impact_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages metrics" ON public.impact_metrics FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates metrics" ON public.impact_metrics FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes metrics" ON public.impact_metrics FOR DELETE TO authenticated USING (public.is_super_admin());

-- Gallery items: public sees approved ones
CREATE POLICY "Public can view approved gallery" ON public.gallery_items FOR SELECT TO anon USING (approved_by_ceo = true);
CREATE POLICY "Authenticated can view gallery" ON public.gallery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages gallery" ON public.gallery_items FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates gallery" ON public.gallery_items FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes gallery" ON public.gallery_items FOR DELETE TO authenticated USING (public.is_super_admin());

-- Audit logs: CEO only
CREATE POLICY "Super admin views audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "System inserts audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- System config: CEO only
CREATE POLICY "Super admin views config" ON public.system_config FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin manages config" ON public.system_config FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Super admin updates config" ON public.system_config FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Super admin deletes config" ON public.system_config FOR DELETE TO authenticated USING (public.is_super_admin());
