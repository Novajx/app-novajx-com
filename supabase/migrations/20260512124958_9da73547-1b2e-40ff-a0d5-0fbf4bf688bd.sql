REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;