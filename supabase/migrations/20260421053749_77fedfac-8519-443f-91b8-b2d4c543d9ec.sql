-- Drop the overly permissive public read policy on profiles
DROP POLICY IF EXISTS "public read profiles" ON public.profiles;

-- Allow only authenticated users to read profiles
CREATE POLICY "authenticated read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can already read via has_role; ensure explicit admin select policy exists
CREATE POLICY "admins read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));