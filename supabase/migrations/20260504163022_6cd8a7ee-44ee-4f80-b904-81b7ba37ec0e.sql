
-- 1. Add moderator role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- 2. Staff helper (admin OR moderator). Use ::text to avoid enum-commit issue.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','moderator')
  )
$$;

-- 3. Broaden read policies to staff
DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
CREATE POLICY "staff read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins view kyc" ON public.kyc_submissions;
CREATE POLICY "staff view kyc" ON public.kyc_submissions
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins view all transactions" ON public.transactions;
CREATE POLICY "staff view transactions" ON public.transactions
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins view wallets" ON public.wallets;
CREATE POLICY "staff view wallets" ON public.wallets
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins view audit" ON public.admin_audit_log;
CREATE POLICY "staff view audit" ON public.admin_audit_log
  FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins view withdrawals" ON public.withdrawal_requests;
CREATE POLICY "staff view withdrawals" ON public.withdrawal_requests
  FOR SELECT USING (public.is_staff(auth.uid()));

-- 4. Update RPCs: allow moderators on KYC + ban; admins only for wallets/withdrawals
CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  target_user uuid;
  sub_cnic_hash text;
  referrer_uuid uuid;
  rnt_reward numeric;
  referral_row_id uuid;
  already_rewarded boolean;
begin
  if not public.is_staff(uid) then raise exception 'Staff only'; end if;

  select user_id, encode(digest(coalesce(cnic_hash, id_number),'sha256'),'hex')
    into target_user, sub_cnic_hash
    from public.kyc_submissions where id = _kyc_id;
  if target_user is null then raise exception 'KYC submission not found'; end if;

  if _action = 'approve' then
    if exists (
      select 1 from public.kyc_submissions
      where status = 'approved' and cnic_hash = sub_cnic_hash and id <> _kyc_id
    ) then
      raise exception 'This ID number is already registered to another account';
    end if;

    update public.kyc_submissions
      set status = 'approved', reviewed_at = now(), reviewed_by = uid,
          rejection_reason = null, cnic_hash = sub_cnic_hash
      where id = _kyc_id;
    update public.profiles
      set kyc_approved_at = coalesce(kyc_approved_at, now()),
          cnic_hash = coalesce(cnic_hash, sub_cnic_hash)
      where id = target_user;

    select referred_by into referrer_uuid from public.profiles where id = target_user;
    if referrer_uuid is not null and referrer_uuid <> target_user then
      select id, (total_bonus_earned > 0) into referral_row_id, already_rewarded
        from public.referrals
        where referrer_id = referrer_uuid and referred_id = target_user;

      if referral_row_id is not null and not coalesce(already_rewarded,false) then
        select coalesce((value)::text::numeric, 1) into rnt_reward
          from public.app_settings where key = 'rnt_signup_reward';
        rnt_reward := coalesce(rnt_reward, 1);

        update public.wallets
          set rnt_balance = rnt_balance + rnt_reward, updated_at = now()
          where user_id = referrer_uuid;
        update public.referrals
          set status = 'active', total_bonus_earned = total_bonus_earned + rnt_reward,
              last_activity_at = now()
          where id = referral_row_id;
      end if;
    end if;

  elsif _action = 'reject' then
    update public.kyc_submissions
      set status = 'rejected', reviewed_at = now(), reviewed_by = uid, rejection_reason = _reason
      where id = _kyc_id;
  else
    raise exception 'Invalid action';
  end if;

  insert into public.admin_audit_log (admin_id, action_type, affected_user, details)
  values (uid, 'kyc_' || _action, target_user, jsonb_build_object('kyc_id', _kyc_id, 'reason', _reason));
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_banned(_user_id uuid, _banned boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.is_staff(uid) THEN RAISE EXCEPTION 'Staff only'; END IF;
  -- Prevent banning admins (moderators must not silence admins)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'Cannot modify admin accounts'; END IF;
  END IF;
  UPDATE public.profiles SET banned = _banned WHERE id = _user_id;
  INSERT INTO public.admin_audit_log (admin_id, action_type, affected_user, details)
  VALUES (uid, CASE WHEN _banned THEN 'ban_user' ELSE 'unban_user' END, _user_id, '{}'::jsonb);
END;
$function$;
