-- Remove 20-day KYC delay and minimum swap limit for swap_njx
-- Verified (KYC approved) users can immediately swap any positive amount
CREATE OR REPLACE FUNCTION public.swap_njx(_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Also remove 20-day delay on transfer_njx (KYC still required)
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