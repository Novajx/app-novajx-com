
CREATE OR REPLACE FUNCTION public.transfer_njx(_recipient text, _amount numeric, _note text DEFAULT NULL::text, _idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  receiver_uuid uuid;
  sender_balance numeric;
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
$function$;

-- Drop the older 3-arg overload so callers consistently use the new signature
DROP FUNCTION IF EXISTS public.transfer_njx(text, numeric, text);
