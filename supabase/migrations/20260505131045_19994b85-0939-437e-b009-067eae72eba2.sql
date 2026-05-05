CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _make_moderator boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  IF has_role(_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Cannot modify admin role';
  END IF;
  IF _make_moderator THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'moderator';
  END IF;
  INSERT INTO public.admin_audit_log (admin_id, action_type, affected_user, details)
  VALUES (auth.uid(), CASE WHEN _make_moderator THEN 'grant_moderator' ELSE 'revoke_moderator' END, _user_id, '{}'::jsonb);
END;
$$;