-- 1. Update referral bonus setting to 0.1
UPDATE public.app_settings SET value = '0.1'::jsonb, updated_at = now() WHERE key = 'referral_bonus_per_mine';
INSERT INTO public.app_settings (key, value) VALUES ('referral_bonus_per_mine', '0.1'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '0.1'::jsonb, updated_at = now();

-- 2. Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'completed',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender ON public.transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON public.transactions(receiver_id, created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "admins view all transactions" ON public.transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add total_sent / total_received tracking columns to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS total_sent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_received numeric NOT NULL DEFAULT 0;

-- 4. Lookup function: find a user by email or referral code (returns minimal info)
CREATE OR REPLACE FUNCTION public.find_user_for_transfer(_query text)
RETURNS TABLE(id uuid, full_name text, referral_code text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.referral_code
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.banned = false
    AND (
      lower(p.email) = lower(trim(_query))
      OR upper(p.referral_code) = upper(trim(_query))
      OR p.id::text = trim(_query)
    )
  LIMIT 1;
$$;

-- 5. Transfer function
CREATE OR REPLACE FUNCTION public.transfer_njx(_recipient text, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  receiver_uuid uuid;
  sender_balance numeric;
  new_tx_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND banned = true) THEN
    RAISE EXCEPTION 'Account banned';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  IF _recipient IS NULL OR length(trim(_recipient)) = 0 THEN RAISE EXCEPTION 'Recipient required'; END IF;

  -- Resolve recipient by email, referral_code, or id
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

  -- Lock sender wallet row
  SELECT balance INTO sender_balance FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF sender_balance IS NULL OR sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct sender
  UPDATE public.wallets
    SET balance = balance - _amount,
        total_sent = total_sent + _amount,
        updated_at = now()
  WHERE user_id = uid;

  -- Credit receiver
  UPDATE public.wallets
    SET balance = balance + _amount,
        total_received = total_received + _amount,
        updated_at = now()
  WHERE user_id = receiver_uuid;

  -- Record transaction
  INSERT INTO public.transactions (sender_id, receiver_id, amount, status, note)
  VALUES (uid, receiver_uuid, _amount, 'completed', _note)
  RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'amount', _amount, 'receiver_id', receiver_uuid);
END;
$$;

-- 6. Update claim_mining to use new 0.1 referral bonus default
CREATE OR REPLACE FUNCTION public.claim_mining()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  next_at timestamptz;
  base_amt numeric;
  ref_bonus numeric;
  referrer_uuid uuid;
  new_session_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and banned = true) then
    raise exception 'Account banned';
  end if;

  select max(next_available_at) into next_at from public.mining_sessions where user_id = uid;
  if next_at is not null and next_at > now() then
    raise exception 'Mining cooldown active';
  end if;

  select (value)::text::numeric into base_amt from public.app_settings where key = 'daily_mining_amount';
  select (value)::text::numeric into ref_bonus from public.app_settings where key = 'referral_bonus_per_mine';
  base_amt := coalesce(base_amt, 2);
  ref_bonus := coalesce(ref_bonus, 0.1);

  insert into public.mining_sessions (user_id, base_amount, referral_bonus, total_amount, next_available_at)
  values (uid, base_amt, 0, base_amt, now() + interval '24 hours')
  returning id into new_session_id;

  update public.wallets
    set balance = balance + base_amt,
        total_mined = total_mined + base_amt,
        updated_at = now()
  where user_id = uid;

  select referred_by into referrer_uuid from public.profiles where id = uid;
  if referrer_uuid is not null then
    insert into public.referral_bonuses (referrer_id, referred_id, mining_session_id, amount)
    values (referrer_uuid, uid, new_session_id, ref_bonus);
    update public.wallets
      set balance = balance + ref_bonus,
          referral_earnings = referral_earnings + ref_bonus,
          updated_at = now()
    where user_id = referrer_uuid;
    update public.referrals
      set total_bonus_earned = total_bonus_earned + ref_bonus,
          last_activity_at = now(), status = 'active'
    where referrer_id = referrer_uuid and referred_id = uid;
  end if;

  return jsonb_build_object('amount', base_amt, 'next_available_at', now() + interval '24 hours');
end;
$function$;