
-- Hero slides for home page carousel
CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  cta_text text,
  cta_link text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved hero slides" ON public.hero_slides FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages hero slides" ON public.hero_slides FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Programs table (dynamic, replaces static)
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved programs" ON public.programs FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages programs" ON public.programs FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Facilities table
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved facilities" ON public.facilities FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages facilities" ON public.facilities FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Mentors table
CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  expertise text,
  photo_url text,
  bio text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved mentors" ON public.mentors FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages mentors" ON public.mentors FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved partners" ON public.partners FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages partners" ON public.partners FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Startup Portfolio table
CREATE TABLE public.startup_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  live_link text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.startup_portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved startups" ON public.startup_portfolio FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages startups" ON public.startup_portfolio FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date,
  image_url text,
  is_upcoming boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved events" ON public.events FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages events" ON public.events FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- News/Updates table
CREATE TABLE public.news_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  published_date date,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  visibility public.visibility_type NOT NULL DEFAULT 'public',
  approved_by_ceo boolean NOT NULL DEFAULT false,
  approved_by_delegate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.news_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view approved updates" ON public.news_updates FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
  OR is_super_admin()
);
CREATE POLICY "Super admin manages updates" ON public.news_updates FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Contact messages (public can insert, CEO can view)
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact message" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Super admin views contact messages" ON public.contact_messages FOR SELECT USING (is_super_admin());
CREATE POLICY "Super admin manages contact messages" ON public.contact_messages FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Add approved_by_delegate to existing team_members table
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS approved_by_delegate boolean NOT NULL DEFAULT false;

-- Add approved_by_delegate to existing impact_metrics table
ALTER TABLE public.impact_metrics ADD COLUMN IF NOT EXISTS approved_by_delegate boolean NOT NULL DEFAULT false;

-- Add approved_by_delegate to existing announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS approved_by_delegate boolean NOT NULL DEFAULT false;

-- Add approved_by_delegate to existing gallery_items table  
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS approved_by_delegate boolean NOT NULL DEFAULT false;

-- Create public-assets storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public-assets bucket
CREATE POLICY "Public can view public assets" ON storage.objects FOR SELECT USING (bucket_id = 'public-assets');
CREATE POLICY "Super admin uploads public assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public-assets' AND public.is_super_admin());
CREATE POLICY "Super admin deletes public assets" ON storage.objects FOR DELETE USING (bucket_id = 'public-assets' AND public.is_super_admin());

-- Update team_members public view policy to include delegate approval
DROP POLICY IF EXISTS "Public can view approved team" ON public.team_members;
CREATE POLICY "Public can view approved team" ON public.team_members FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true))
);

-- Update impact_metrics to include delegate
DROP POLICY IF EXISTS "Public can view metrics" ON public.impact_metrics;
CREATE POLICY "Public can view metrics" ON public.impact_metrics FOR SELECT USING (true);

-- Update announcements public policy
DROP POLICY IF EXISTS "Public can view approved announcements" ON public.announcements;
CREATE POLICY "Public can view approved announcements" ON public.announcements FOR SELECT USING (
  (visibility = 'public' AND (approved_by_ceo = true OR approved_by_delegate = true) AND (expires_at IS NULL OR expires_at > now()))
);
