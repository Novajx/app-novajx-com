
-- Create sanitized profiles view for staff (moderators + admins)
-- Excludes sensitive columns: cnic_hash, device_id, last_login_ip, phone
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  email,
  country,
  referral_code,
  referred_by,
  kyc_approved_at,
  banned,
  created_at
FROM public.profiles
WHERE
  public.is_staff(auth.uid())
  OR auth.uid() = id;

GRANT SELECT ON public.profiles_safe TO authenticated;
