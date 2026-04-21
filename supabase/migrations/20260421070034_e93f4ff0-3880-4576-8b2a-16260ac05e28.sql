-- Drop the overly-permissive profiles SELECT policy
DROP POLICY IF EXISTS "authenticated read profiles" ON public.profiles;

-- Replace with owner-only SELECT (admins keep access via existing "admins read profiles" policy)
CREATE POLICY "users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Explicitly block non-admin INSERTs into user_roles.
-- Existing "admins manage roles" (ALL) policy already permits admins; this adds a
-- restrictive policy so any INSERT must satisfy admin check (defense-in-depth).
CREATE POLICY "only admins insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));