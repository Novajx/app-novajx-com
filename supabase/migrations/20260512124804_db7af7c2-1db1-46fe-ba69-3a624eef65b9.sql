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
  ref_code := nullif(upper(trim(new.raw_user_meta_data->>'referral_code')), '');
  if ref_code is not null then
    select id into referrer_uuid
    from public.profiles
    where upper(referral_code) = ref_code
    limit 1;

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
    on conflict (referred_id) do nothing;

    if found then
      update public.wallets
        set rnt_balance = rnt_balance + rnt_reward, updated_at = now()
        where user_id = referrer_uuid;
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(_ref_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  cleaned_code text;
  referrer_uuid uuid;
  current_referrer uuid;
  rnt_reward numeric;
  inserted_referral_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  cleaned_code := nullif(upper(trim(_ref_code)), '');
  if cleaned_code is null then
    return jsonb_build_object('applied', false, 'reason', 'missing_code');
  end if;

  select id into referrer_uuid
  from public.profiles
  where upper(referral_code) = cleaned_code
  limit 1;

  if referrer_uuid is null then
    return jsonb_build_object('applied', false, 'reason', 'invalid_code');
  end if;

  if referrer_uuid = uid then
    return jsonb_build_object('applied', false, 'reason', 'self_referral');
  end if;

  select referred_by into current_referrer
  from public.profiles
  where id = uid
  for update;

  if current_referrer is not null then
    return jsonb_build_object('applied', false, 'reason', 'already_referred');
  end if;

  if exists (select 1 from public.referrals where referred_id = uid) then
    return jsonb_build_object('applied', false, 'reason', 'already_rewarded');
  end if;

  select coalesce((value)::text::numeric, 1) into rnt_reward
    from public.app_settings where key = 'rnt_signup_reward';
  rnt_reward := coalesce(rnt_reward, 1);

  update public.profiles
    set referred_by = referrer_uuid
    where id = uid and referred_by is null;

  insert into public.referrals (referrer_id, referred_id, status, total_bonus_earned, last_activity_at)
  values (referrer_uuid, uid, 'active', rnt_reward, now())
  on conflict (referred_id) do nothing
  returning id into inserted_referral_id;

  if inserted_referral_id is null then
    return jsonb_build_object('applied', false, 'reason', 'already_rewarded');
  end if;

  update public.wallets
    set rnt_balance = rnt_balance + rnt_reward, updated_at = now()
    where user_id = referrer_uuid;

  return jsonb_build_object('applied', true, 'reward', rnt_reward, 'referrer_id', referrer_uuid);
end;
$function$;