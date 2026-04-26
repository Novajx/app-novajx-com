
-- 1. Add rnt_balance column to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS rnt_balance numeric NOT NULL DEFAULT 0;

-- 2. Ensure unique referral relationship to prevent duplicate rewards
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referrer_referred_unique
  ON public.referrals (referrer_id, referred_id);

-- 3. Update handle_new_user: award 1 RNT, prevent self-referral, prevent duplicate rewards
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
    -- Prevent self-referral abuse (defensive; new user shouldn't own a code yet)
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

  insert into public.wallets (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'user');

  if referrer_uuid is not null then
    -- Insert referral relationship; ON CONFLICT ensures one-time reward
    insert into public.referrals (referrer_id, referred_id, status)
    values (referrer_uuid, new.id, 'active')
    on conflict (referrer_id, referred_id) do nothing
    returning id into inserted_referral_id;

    -- Only award RNT if a new referral row was inserted (first signup only)
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

-- 4. Seed RNT signup reward setting
INSERT INTO public.app_settings (key, value)
VALUES ('rnt_signup_reward', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. RNT internal transfer function (separate from NJX)
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

  SELECT id INTO receiver_uuid FROM public.profiles
  WHERE banned = false
    AND (
      lower(email) = lower(trim(_recipient))
      OR upper(referral_code) = upper(trim(_recipient))
      OR id::text = trim(_recipient)
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
