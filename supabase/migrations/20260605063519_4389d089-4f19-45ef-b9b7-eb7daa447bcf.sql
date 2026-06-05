-- Enforce 20-day waiting period after KYC approval for swap and withdrawal

CREATE OR REPLACE FUNCTION public.swap_njx(_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  approved_at timestamptz;
  unlock_at timestamptz;
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

  unlock_at := approved_at + interval '20 days';
  if now() < unlock_at then
    raise exception 'Withdrawal locked: 20 days waiting period after KYC approval. Unlocks on %', to_char(unlock_at, 'YYYY-MM-DD HH24:MI');
  end if;

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

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _wallet_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  user_balance numeric;
  min_amt numeric;
  kyc_req boolean;
  has_kyc boolean;
  approved_at timestamptz;
  unlock_at timestamptz;
  new_id uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Invalid amount'; end if;
  if _wallet_address is null or length(trim(_wallet_address)) < 6 then raise exception 'Invalid wallet address'; end if;

  select (value)::text::numeric into min_amt from public.app_settings where key = 'min_withdrawal';
  min_amt := coalesce(min_amt, 50);
  if _amount < min_amt then raise exception 'Minimum withdrawal is % NJX', min_amt; end if;

  select (value)::text::boolean into kyc_req from public.app_settings where key = 'kyc_required';
  if coalesce(kyc_req, true) then
    select exists(select 1 from public.kyc_submissions where user_id = uid and status = 'approved') into has_kyc;
    if not has_kyc then raise exception 'KYC approval required for withdrawal'; end if;
  end if;

  -- Enforce 20-day waiting period after KYC approval
  select kyc_approved_at into approved_at from public.profiles where id = uid;
  if approved_at is null then raise exception 'KYC approval required for withdrawal'; end if;
  unlock_at := approved_at + interval '20 days';
  if now() < unlock_at then
    raise exception 'Withdrawal locked: 20 days waiting period after KYC approval. Unlocks on %', to_char(unlock_at, 'YYYY-MM-DD HH24:MI');
  end if;

  select balance into user_balance from public.wallets where user_id = uid;
  if user_balance is null or user_balance < _amount then raise exception 'Insufficient balance'; end if;

  update public.wallets set balance = balance - _amount, updated_at = now() where user_id = uid;
  insert into public.withdrawal_requests (user_id, amount, wallet_address)
  values (uid, _amount, _wallet_address)
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'amount', _amount);
end;
$function$;