
-- 1) Restrict moderator access to sensitive profile columns by limiting SELECT to admins only.
DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;

CREATE POLICY "admins read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) KYC storage: only allow users to UPDATE/DELETE their own files while no submission
--    is pending review or approved (i.e. before submission, or after a rejection).
DROP POLICY IF EXISTS "users update own kyc files" ON storage.objects;
DROP POLICY IF EXISTS "users delete own kyc files" ON storage.objects;

CREATE POLICY "users update own kyc files (pre-review only)"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND NOT EXISTS (
    SELECT 1 FROM public.kyc_submissions
    WHERE user_id = auth.uid()
      AND status IN ('pending', 'approved')
  )
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND NOT EXISTS (
    SELECT 1 FROM public.kyc_submissions
    WHERE user_id = auth.uid()
      AND status IN ('pending', 'approved')
  )
);

CREATE POLICY "users delete own kyc files (pre-review only)"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND NOT EXISTS (
    SELECT 1 FROM public.kyc_submissions
    WHERE user_id = auth.uid()
      AND status IN ('pending', 'approved')
  )
);
