-- 1. Add wallet_address column
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS wallet_address text;

-- 2. Generator function
CREATE OR REPLACE FUNCTION public.generate_wallet_address()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  addr text;
  cnt int;
BEGIN
  LOOP
    addr := 'NJX-' || upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    SELECT count(*) INTO cnt FROM public.wallets WHERE wallet_address = addr;
    EXIT WHEN cnt = 0;
  END LOOP;
  RETURN addr;
END;
$$;

-- 3. Backfill existing wallets
DO $$
DECLARE w record;
BEGIN
  FOR w IN SELECT id FROM public.wallets WHERE wallet_address IS NULL LOOP
    UPDATE public.wallets SET wallet_address = public.generate_wallet_address() WHERE id = w.id;
  END LOOP;
END $$;

-- 4. Enforce NOT NULL + UNIQUE
ALTER TABLE public.wallets ALTER COLUMN wallet_address SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wallets_wallet_address_key ON public.wallets(wallet_address);

-- 5. Update handle_new_user to set wallet_address on signup
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
  inserted_referral_id uuid;
begin
  ref_code := nullif(new.raw_user_meta_data->>'referral_code', '');
  if ref_code is not null then
    select id into referrer_uuid from public.profiles where referral_code = ref_code;
    if referrer_uuid = new.id then
      referrer_uuid := null;
    end if;
  end if;

  insert into public.profiles (id, full_name, email, country, phone, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone',
    public.generate_referral_code(),
    referrer_uuid
  );

  insert into public.wallets (user_id, wallet_address) values (new.id, public.generate_wallet_address());
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  if referrer_uuid is not null then
    insert into public.referrals (referrer_id, referred_id, status)
    values (referrer_uuid, new.id, 'active')
    on conflict (referrer_id, referred_id) do nothing
    returning id into inserted_referral_id;

    if inserted_referral_id is not null then
      select coalesce((value)::text::numeric, 1) into rnt_reward
      from public.app_settings where key = 'rnt_signup_reward';
      rnt_reward := coalesce(rnt_reward, 1);

      update public.wallets
        set rnt_balance = rnt_balance + rnt_reward,
            updated_at = now()
      where user_id = referrer_uuid;
    end if;
  end if;

  return new;
end;
$function$;

-- 6. Update find_user_for_transfer to also match wallet_address
CREATE OR REPLACE FUNCTION public.find_user_for_transfer(_query text)
 RETURNS TABLE(id uuid, full_name text, referral_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.referral_code
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE auth.uid() IS NOT NULL
    AND p.banned = false
    AND (
      lower(p.email) = lower(trim(_query))
      OR upper(p.referral_code) = upper(trim(_query))
      OR upper(w.wallet_address) = upper(trim(_query))
      OR p.id::text = trim(_query)
    )
  LIMIT 1;
$function$;

-- 7. Update transfer_njx to accept wallet_address
CREATE OR REPLACE FUNCTION public.transfer_njx(_recipient text, _amount numeric, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  receiver_uuid uuid;
  sender_balance numeric;
  approved_at timestamptz;
  lock_days int;
  unlock_date timestamptz;
  new_tx_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND banned = true) THEN
    RAISE EXCEPTION 'Account banned';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  IF _recipient IS NULL OR length(trim(_recipient)) = 0 THEN RAISE EXCEPTION 'Recipient required'; END IF;

  SELECT kyc_approved_at INTO approved_at FROM public.profiles WHERE id = uid;
  IF approved_at IS NULL THEN
    RAISE EXCEPTION 'KYC approval required to send credits';
  END IF;

  SELECT (value)::text::int INTO lock_days FROM public.app_settings WHERE key = 'swap_lock_days';
  lock_days := COALESCE(lock_days, 20);
  unlock_date := approved_at + (lock_days || ' days')::interval;
  IF now() < unlock_date THEN
    RAISE EXCEPTION 'Transfers available after % days of KYC approval', lock_days;
  END IF;

  SELECT p.id INTO receiver_uuid FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE p.banned = false
    AND (
      lower(p.email) = lower(trim(_recipient))
      OR upper(p.referral_code) = upper(trim(_recipient))
      OR upper(w.wallet_address) = upper(trim(_recipient))
      OR p.id::text = trim(_recipient)
    )
  LIMIT 1;

  IF receiver_uuid IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF receiver_uuid = uid THEN RAISE EXCEPTION 'Cannot send to yourself'; END IF;

  SELECT balance INTO sender_balance FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF sender_balance IS NULL OR sender_balance <= 0 THEN
    RAISE EXCEPTION 'No available credits. Convert your credits first';
  END IF;
  IF sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets
    SET balance = balance - _amount,
        total_sent = total_sent + _amount,
        updated_at = now()
  WHERE user_id = uid;

  UPDATE public.wallets
    SET balance = balance + _amount,
        total_received = total_received + _amount,
        updated_at = now()
  WHERE user_id = receiver_uuid;

  INSERT INTO public.transactions (sender_id, receiver_id, amount, status, type, note)
  VALUES (uid, receiver_uuid, _amount, 'completed', 'transfer', _note)
  RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'amount', _amount, 'receiver_id', receiver_uuid);
END;
$function$;

-- 8. Update transfer_rnt to accept wallet_address
CREATE OR REPLACE FUNCTION public.transfer_rnt(_recipient text, _amount numeric, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  receiver_uuid uuid;
  sender_rnt numeric;
  new_tx_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND banned = true) THEN
    RAISE EXCEPTION 'Account banned';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  IF _recipient IS NULL OR length(trim(_recipient)) = 0 THEN RAISE EXCEPTION 'Recipient required'; END IF;

  SELECT p.id INTO receiver_uuid FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE p.banned = false
    AND (
      lower(p.email) = lower(trim(_recipient))
      OR upper(p.referral_code) = upper(trim(_recipient))
      OR upper(w.wallet_address) = upper(trim(_recipient))
      OR p.id::text = trim(_recipient)
    )
  LIMIT 1;

  IF receiver_uuid IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF receiver_uuid = uid THEN RAISE EXCEPTION 'Cannot send to yourself'; END IF;

  SELECT rnt_balance INTO sender_rnt FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF sender_rnt IS NULL OR sender_rnt < _amount THEN
    RAISE EXCEPTION 'Insufficient RNT balance';
  END IF;

  UPDATE public.wallets
    SET rnt_balance = rnt_balance - _amount,
        updated_at = now()
  WHERE user_id = uid;

  UPDATE public.wallets
    SET rnt_balance = rnt_balance + _amount,
        updated_at = now()
  WHERE user_id = receiver_uuid;

  INSERT INTO public.transactions (sender_id, receiver_id, amount, status, type, note)
  VALUES (uid, receiver_uuid, _amount, 'completed', 'rnt_transfer', _note)
  RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'amount', _amount, 'receiver_id', receiver_uuid);
END;
$function$;