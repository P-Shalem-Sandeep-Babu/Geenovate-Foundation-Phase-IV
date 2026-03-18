
-- Fix: restrict audit log inserts to the system (via triggers/functions, not direct user inserts)
-- Drop the overly permissive policy
DROP POLICY "System inserts audit logs" ON public.audit_logs;

-- Only super_admin can insert audit logs directly; system logging will use security definer functions
CREATE POLICY "Super admin inserts audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

-- Create a security definer function for system-level audit logging
CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _details JSONB DEFAULT NULL,
  _user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (COALESCE(_user_id, auth.uid()), _action, _details);
END;
$$;
