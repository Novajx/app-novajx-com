-- 1. Add locked_balance to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS locked_balance numeric NOT NULL DEFAULT 0;

-- 2. Add kyc_approved_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;

-- 3. Add type column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'transfer';

-- 4. Update settings
INSERT INTO public.app_settings (key, value) VALUES
  ('min_withdrawal', '40'::jsonb),
  ('min_swap', '50'::jsonb),
  ('swap_lock_days', '20'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 5. Update claim_mining to put coins into locked_balance
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

  -- Credit LOCKED balance (not spendable until swapped)
  update public.wallets
    set locked_balance = locked_balance + base_amt,
        total_mined = total_mined + base_amt,
        updated_at = now()
  where user_id = uid;

  select referred_by into referrer_uuid from public.profiles where id = uid;
  if referrer_uuid is not null then
    insert into public.referral_bonuses (referrer_id, referred_id, mining_session_id, amount)
    values (referrer_uuid, uid, new_session_id, ref_bonus);
    -- Referral bonus also goes to LOCKED balance
    update public.wallets
      set locked_balance = locked_balance + ref_bonus,
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

-- 6. Update admin_review_kyc to stamp kyc_approved_at on approval
CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  target_user uuid;
begin
  if not public.has_role(uid, 'admin') then raise exception 'Admin only'; end if;

  select user_id into target_user from public.kyc_submissions where id = _kyc_id;
  if target_user is null then raise exception 'KYC submission not found'; end if;

  if _action = 'approve' then
    update public.kyc_submissions
      set status = 'approved', reviewed_at = now(), reviewed_by = uid, rejection_reason = null
      where id = _kyc_id;
    -- Stamp approval timestamp on profile (only if not already set, to keep first approval date)
    update public.profiles
      set kyc_approved_at = coalesce(kyc_approved_at, now())
      where id = target_user;
  elsif _action = 'reject' then
    update public.kyc_submissions
      set status = 'rejected', reviewed_at = now(), reviewed_by = uid, rejection_reason = _reason
      where id = _kyc_id;
  else
    raise exception 'Invalid action';
  end if;
end;
$function$;

-- 7. New swap_njx function: move locked -> wallet
CREATE OR REPLACE FUNCTION public.swap_njx(_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  approved_at timestamptz;
  lock_days int;
  min_swap numeric;
  user_locked numeric;
  new_tx_id uuid;
  unlock_date timestamptz;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.profiles where id = uid and banned = true) then
    raise exception 'Account banned';
  end if;
  if _amount is null or _amount <= 0 then raise exception 'Amount must be greater than 0'; end if;

  select kyc_approved_at into approved_at from public.profiles where id = uid;
  if approved_at is null then raise exception 'KYC approval required to swap'; end if;

  select (value)::text::int into lock_days from public.app_settings where key = 'swap_lock_days';
  lock_days := coalesce(lock_days, 20);
  unlock_date := approved_at + (lock_days || ' days')::interval;
  if now() < unlock_date then
    raise exception 'Swap available after % days (unlocks %)', lock_days, to_char(unlock_date, 'YYYY-MM-DD');
  end if;

  select (value)::text::numeric into min_swap from public.app_settings where key = 'min_swap';
  min_swap := coalesce(min_swap, 50);
  if _amount < min_swap then raise exception 'Minimum swap is % NJX', min_swap; end if;

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
$function$;

-- 8. Backfill kyc_approved_at for already-approved users
UPDATE public.profiles p
SET kyc_approved_at = k.reviewed_at
FROM public.kyc_submissions k
WHERE k.user_id = p.id
  AND k.status = 'approved'
  AND p.kyc_approved_at IS NULL
  AND k.reviewed_at IS NOT NULL;