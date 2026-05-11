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
    on conflict (referred_id) do update
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