
-- Allow super admin to update cohort files (for toggling important/restricted flags)
CREATE POLICY "Super admin updates cohort files"
ON public.cohort_files
FOR UPDATE
USING (is_super_admin());

-- Add storage policies for cohort-files bucket
CREATE POLICY "Cohort members can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cohort-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Cohort members can view files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cohort-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Super admin can delete storage files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cohort-files'
  AND public.is_super_admin()
);
