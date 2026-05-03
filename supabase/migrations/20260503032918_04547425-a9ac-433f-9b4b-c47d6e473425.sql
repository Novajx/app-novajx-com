
-- 1. Profile tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS last_login_ip text,
  ADD COLUMN IF NOT EXISTS cnic_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cnic_hash_unique
  ON public.profiles (cnic_hash) WHERE cnic_hash IS NOT NULL;

-- 2. KYC: prevent duplicate CNIC across approved submissions
ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS cnic_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS kyc_cnic_hash_approved_unique
  ON public.kyc_submissions (cnic_hash)
  WHERE cnic_hash IS NOT NULL AND status = 'approved';

-- 3. Transactions: idempotency
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_sender_idem_unique
  ON public.transactions (sender_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. Rate limit table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_user_action_time_idx
  ON public.rate_limits (user_id, action, created_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins view rate_limits" ON public.rate_limits;
CREATE POLICY "admins view rate_limits" ON public.rate_limits
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  affected_user uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins view audit" ON public.admin_audit_log;
CREATE POLICY "admins view audit" ON public.admin_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 6. Rate limit helper
CREATE OR REPLACE FUNCTION public.check_rate_limit(_action text, _max int, _window interval)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cnt int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT count(*) INTO cnt FROM public.rate_limits
    WHERE user_id = uid AND action = _action AND created_at > now() - _window;
  IF cnt >= _max THEN
    RAISE EXCEPTION 'Too many requests. Please try again later.';
  END IF;
  INSERT INTO public.rate_limits (user_id, action) VALUES (uid, _action);
  -- opportunistic cleanup
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 day';
END;
$$;

-- 7. Update handle_new_user: do NOT grant RNT at signup; only create referral row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  ref_code text;
  referrer_uuid uuid;
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
    insert into public.referrals (referrer_id, referred_id, status)
    values (referrer_uuid, new.id, 'pending')
    on conflict (referrer_id, referred_id) do nothing;
  end if;

  return new;
end;
$$;

-- 8. Update admin_review_kyc: grant RNT on first approval, log action, enforce CNIC uniqueness
CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _action text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  uid uuid := auth.uid();
  target_user uuid;
  sub_cnic_hash text;
  referrer_uuid uuid;
  rnt_reward numeric;
  referral_row_id uuid;
  already_rewarded boolean;
begin
  if not public.has_role(uid, 'admin') then raise exception 'Admin only'; end if;

  select user_id, encode(digest(coalesce(cnic_hash, id_number),'sha256'),'hex')
    into target_user, sub_cnic_hash
    from public.kyc_submissions where id = _kyc_id;
  if target_user is null then raise exception 'KYC submission not found'; end if;

  if _action = 'approve' then
    -- enforce unique CNIC across approved
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

    -- Grant referral RNT now (only once per referred user)
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
$$;

-- 9. Patch swap_njx with rate limit
CREATE OR REPLACE FUNCTION public.swap_njx(_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  uid uuid := auth.uid();
  approved_at timestamptz;
  user_locked numeric;
  new_tx_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and banned = true) then
    raise exception 'Account banned';
  end if;
  if _amount is null or _amount <= 0 then raise exception 'Amount must be greater than 0'; end if;

  perform public.check_rate_limit('swap', 5, interval '1 minute');

  select kyc_approved_at into approved_at from public.profiles where id = uid;
  if approved_at is null then raise exception 'KYC approval required to swap'; end if;

  select locked_balance into user_locked from public.wallets where user_id = uid for update;
  if user_locked is null or user_locked < _amount then
    raise exception 'Insufficient locked balance';
  end if;

  update public.wallets
    set locked_balance = locked_balance - _amount,
        balance = balance + _amount,
        updated_at = now()
  where user_id = uid;

  insert into public.transactions (sender_id, receiver_id, amount, status, type, note)
  values (uid, uid, _amount, 'completed', 'swap', 'Locked → Wallet swap')
  returning id into new_tx_id;

  return jsonb_build_object('id', new_tx_id, 'amount', _amount);
end;
$$;

-- 10. Patch transfer_njx: rate limit + idempotency
CREATE OR REPLACE FUNCTION public.transfer_njx(_recipient text, _amount numeric, _note text DEFAULT NULL, _idempotency_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  receiver_uuid uuid;
  sender_balance numeric;
  approved_at timestamptz;
  new_tx_id uuid;
  existing_tx uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND banned = true) THEN
    RAISE EXCEPTION 'Account banned';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  IF _recipient IS NULL OR length(trim(_recipient)) = 0 THEN RAISE EXCEPTION 'Recipient required'; END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing_tx FROM public.transactions
      WHERE sender_id = uid AND idempotency_key = _idempotency_key LIMIT 1;
    IF existing_tx IS NOT NULL THEN
      RETURN jsonb_build_object('id', existing_tx, 'amount', _amount, 'duplicate', true);
    END IF;
  END IF;

  PERFORM public.check_rate_limit('transfer', 10, interval '1 minute');

  SELECT kyc_approved_at INTO approved_at FROM public.profiles WHERE id = uid;
  IF approved_at IS NULL THEN
    RAISE EXCEPTION 'KYC approval required to send credits';
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
  IF sender_balance IS NULL OR sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets
    SET balance = balance - _amount, total_sent = total_sent + _amount, updated_at = now()
    WHERE user_id = uid;
  UPDATE public.wallets
    SET balance = balance + _amount, total_received = total_received + _amount, updated_at = now()
    WHERE user_id = receiver_uuid;

  INSERT INTO public.transactions (sender_id, receiver_id, amount, status, type, note, idempotency_key)
  VALUES (uid, receiver_uuid, _amount, 'completed', 'transfer', _note, _idempotency_key)
  RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'amount', _amount, 'receiver_id', receiver_uuid);
END;
$$;

-- 11. Patch transfer_rnt: rate limit + idempotency
CREATE OR REPLACE FUNCTION public.transfer_rnt(_recipient text, _amount numeric, _note text DEFAULT NULL, _idempotency_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  receiver_uuid uuid;
  sender_rnt numeric;
  new_tx_id uuid;
  existing_tx uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND banned = true) THEN
    RAISE EXCEPTION 'Account banned';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  IF _recipient IS NULL OR length(trim(_recipient)) = 0 THEN RAISE EXCEPTION 'Recipient required'; END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO existing_tx FROM public.transactions
      WHERE sender_id = uid AND idempotency_key = _idempotency_key LIMIT 1;
    IF existing_tx IS NOT NULL THEN
      RETURN jsonb_build_object('id', existing_tx, 'amount', _amount, 'duplicate', true);
    END IF;
  END IF;

  PERFORM public.check_rate_limit('transfer', 10, interval '1 minute');

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

  UPDATE public.wallets SET rnt_balance = rnt_balance - _amount, updated_at = now() WHERE user_id = uid;
  UPDATE public.wallets SET rnt_balance = rnt_balance + _amount, updated_at = now() WHERE user_id = receiver_uuid;

  INSERT INTO public.transactions (sender_id, receiver_id, amount, status, type, note, idempotency_key)
  VALUES (uid, receiver_uuid, _amount, 'completed', 'rnt_transfer', _note, _idempotency_key)
  RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'amount', _amount, 'receiver_id', receiver_uuid);
END;
$$;

-- 12. Add ban/unban helper with audit logging
CREATE OR REPLACE FUNCTION public.admin_set_banned(_user_id uuid, _banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.profiles SET banned = _banned WHERE id = _user_id;
  INSERT INTO public.admin_audit_log (admin_id, action_type, affected_user, details)
  VALUES (uid, CASE WHEN _banned THEN 'ban_user' ELSE 'unban_user' END, _user_id, '{}'::jsonb);
END;
$$;
