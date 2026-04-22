-- ============================================================
-- 1. KYC storage bucket: add UPDATE and DELETE policies
-- ============================================================

-- Owner (file uploaded under a folder named by their user id) can update
CREATE POLICY "users update own kyc files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner can delete their own KYC files
CREATE POLICY "users delete own kyc files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can update any KYC file
CREATE POLICY "admins update kyc files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Admins can delete any KYC file
CREATE POLICY "admins delete kyc files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- 2. user_roles: scope admin policy to authenticated, add
--    restrictive UPDATE/DELETE blocks for non-admins.
-- ============================================================

-- Replace the public-scoped permissive admin policy with one
-- that explicitly targets authenticated users only.
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

CREATE POLICY "admins manage roles"
ON public.user_roles
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict the "users view own roles" SELECT policy to authenticated role
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;

CREATE POLICY "users view own roles"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Defense-in-depth: restrictive policies blocking non-admin UPDATE/DELETE
CREATE POLICY "only admins update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "only admins delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));