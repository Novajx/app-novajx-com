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

  -- KYC approval gate
  SELECT kyc_approved_at INTO approved_at FROM public.profiles WHERE id = uid;
  IF approved_at IS NULL THEN
    RAISE EXCEPTION 'KYC approval required to send credits';
  END IF;

  -- 20-day post-approval gate
  SELECT (value)::text::int INTO lock_days FROM public.app_settings WHERE key = 'swap_lock_days';
  lock_days := COALESCE(lock_days, 20);
  unlock_date := approved_at + (lock_days || ' days')::interval;
  IF now() < unlock_date THEN
    RAISE EXCEPTION 'Transfers available after % days of KYC approval', lock_days;
  END IF;

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

  -- Lock sender wallet row, only spendable balance is usable
  SELECT balance INTO sender_balance FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF sender_balance IS NULL OR sender_balance <= 0 THEN
    RAISE EXCEPTION 'No available credits. Convert your credits first';
  END IF;
  IF sender_balance < _amount THEN
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
  INSERT INTO public.transactions (sender_id, receiver_id, amount, status, type, note)
  VALUES (uid, receiver_uuid, _amount, 'completed', 'transfer', _note)
  RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'amount', _amount, 'receiver_id', receiver_uuid);
END;
$function$;