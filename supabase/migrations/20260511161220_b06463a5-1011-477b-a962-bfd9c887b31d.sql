CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_kyc_id uuid, _action text, _reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
declare
  uid uuid := auth.uid();
  target_user uuid;
  normalized_id_number text;
  existing_hash text;
  sub_cnic_hash text;
begin
  if not public.is_staff(uid) then raise exception 'Staff only'; end if;

  select user_id,
         nullif(regexp_replace(coalesce(cnic_hash, ''), '\s+', '', 'g'), ''),
         nullif(regexp_replace(coalesce(id_number, ''), '\s+', '', 'g'), '')
    into target_user, existing_hash, normalized_id_number
    from public.kyc_submissions
    where id = _kyc_id;

  if target_user is null then raise exception 'KYC submission not found'; end if;

  sub_cnic_hash := coalesce(existing_hash, encode(extensions.digest(convert_to(normalized_id_number, 'UTF8'), 'sha256'), 'hex'));

  if _action = 'approve' then
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
$function$;