CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ref_code text;
  referrer_uuid uuid;
  rnt_reward numeric;
begin
  ref_code := nullif(new.raw_user_meta_data->>'referral_code', '');
  if ref_code is not null then
    select id into referrer_uuid from public.profiles where referral_code = ref_code;
    if referrer_uuid = new.id then
      referrer_uuid := null;
    end if;
  end if;

  insert into public.profiles (id, full_name, email, country, phone, referral_code, referred_by, last_login_ip, device_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone',
    public.generate_referral_code(),
    referrer_uuid,
    new.raw_user_meta_data->>'signup_ip',
    new.raw_user_meta_data->>'device_id'
  );

  insert into public.wallets (user_id, wallet_address) values (new.id, public.generate_wallet_address());
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  if referrer_uuid is not null then
    select coalesce((value)::text::numeric, 1) into rnt_reward
      from public.app_settings where key = 'rnt_signup_reward';
    rnt_reward := coalesce(rnt_reward, 1);

    insert into public.referrals (referrer_id, referred_id, status, total_bonus_earned, last_activity_at)
    values (referrer_uuid, new.id, 'active', rnt_reward, now())
    on conflict (referrer_id, referred_id) do update
      set status = 'active',
          total_bonus_earned = public.referrals.total_bonus_earned + rnt_reward,
          last_activity_at = now();

    update public.wallets
      set rnt_balance = rnt_balance + rnt_reward, updated_at = now()
      where user_id = referrer_uuid;
  end if;

  return new;
end;
$function$;

-- Also remove the duplicate RNT crediting from KYC approval (since it now happens at signup)
CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  target_user uuid;
  sub_cnic_hash text;
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