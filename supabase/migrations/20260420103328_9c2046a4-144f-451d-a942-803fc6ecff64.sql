-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'user');
create type public.kyc_status as enum ('not_submitted', 'pending', 'approved', 'rejected');
create type public.withdrawal_status as enum ('pending', 'approved', 'rejected', 'paid');
create type public.referral_status as enum ('active', 'inactive');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  country text,
  phone text,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id) on delete set null,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_profiles_referred_by on public.profiles(referred_by);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ============ WALLETS ============
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance numeric(20,4) not null default 0,
  total_mined numeric(20,4) not null default 0,
  referral_earnings numeric(20,4) not null default 0,
  withdrawal_address text,
  updated_at timestamptz not null default now()
);

-- ============ MINING SESSIONS ============
create table public.mining_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  base_amount numeric(20,4) not null default 2,
  referral_bonus numeric(20,4) not null default 0,
  total_amount numeric(20,4) not null default 2,
  claimed_at timestamptz not null default now(),
  next_available_at timestamptz not null default (now() + interval '24 hours')
);
create index idx_mining_user_claimed on public.mining_sessions(user_id, claimed_at desc);

-- ============ REFERRALS ============
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  status public.referral_status not null default 'active',
  total_bonus_earned numeric(20,4) not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_referrals_referrer on public.referrals(referrer_id);

-- ============ REFERRAL BONUSES ============
create table public.referral_bonuses (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  mining_session_id uuid references public.mining_sessions(id) on delete set null,
  amount numeric(20,4) not null default 0.5,
  created_at timestamptz not null default now()
);
create index idx_ref_bonuses_referrer on public.referral_bonuses(referrer_id, created_at desc);

-- ============ KYC SUBMISSIONS ============
create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  dob date not null,
  country text not null,
  id_number text not null,
  id_front_url text not null,
  id_back_url text not null,
  selfie_url text not null,
  status public.kyc_status not null default 'pending',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index idx_kyc_user_status on public.kyc_submissions(user_id, status);

-- ============ WITHDRAWAL REQUESTS ============
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(20,4) not null check (amount > 0),
  wallet_address text not null,
  status public.withdrawal_status not null default 'pending',
  tx_hash text,
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null
);
create index idx_withdraw_user on public.withdrawal_requests(user_id, created_at desc);

-- ============ APP SETTINGS ============
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values
  ('daily_mining_amount', '2'::jsonb),
  ('referral_bonus_per_mine', '0.5'::jsonb),
  ('min_withdrawal', '50'::jsonb),
  ('kyc_required', 'true'::jsonb),
  ('coin_symbol', '"NJX"'::jsonb),
  ('coin_name', '"NovaJX"'::jsonb);

-- ============ FUNCTIONS ============

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.generate_referral_code()
returns text language plpgsql set search_path = public
as $$
declare code text; cnt int;
begin
  loop
    code := 'NJX' || upper(substring(md5(random()::text || clock_timestamp()::text) for 5));
    select count(*) into cnt from public.profiles where referral_code = code;
    exit when cnt = 0;
  end loop;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ref_code text; referrer_uuid uuid;
begin
  ref_code := nullif(new.raw_user_meta_data->>'referral_code', '');
  if ref_code is not null then
    select id into referrer_uuid from public.profiles where referral_code = ref_code;
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
    insert into public.referrals (referrer_id, referred_id, status)
    values (referrer_uuid, new.id, 'active');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.claim_mining()
returns jsonb language plpgsql security definer set search_path = public
as $$
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
  ref_bonus := coalesce(ref_bonus, 0.5);

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
$$;

create or replace function public.request_withdrawal(_amount numeric, _wallet_address text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_balance numeric; min_amt numeric; kyc_req boolean; has_kyc boolean; new_id uuid;
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

  select balance into user_balance from public.wallets where user_id = uid;
  if user_balance is null or user_balance < _amount then raise exception 'Insufficient balance'; end if;

  update public.wallets set balance = balance - _amount, updated_at = now() where user_id = uid;
  insert into public.withdrawal_requests (user_id, amount, wallet_address)
  values (uid, _amount, _wallet_address)
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'amount', _amount);
end;
$$;

create or replace function public.admin_process_withdrawal(_request_id uuid, _action text, _tx_hash text default null, _note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid(); req record;
begin
  if not public.has_role(uid, 'admin') then raise exception 'Admin only'; end if;
  select * into req from public.withdrawal_requests where id = _request_id for update;
  if req is null then raise exception 'Request not found'; end if;
  if req.status not in ('pending','approved') then raise exception 'Already processed'; end if;

  if _action = 'approve' then
    update public.withdrawal_requests set status = 'paid', tx_hash = _tx_hash, admin_note = _note,
      processed_at = now(), processed_by = uid where id = _request_id;
  elsif _action = 'reject' then
    update public.wallets set balance = balance + req.amount, updated_at = now() where user_id = req.user_id;
    update public.withdrawal_requests set status = 'rejected', admin_note = _note,
      processed_at = now(), processed_by = uid where id = _request_id;
  else
    raise exception 'Invalid action';
  end if;
end;
$$;

create or replace function public.admin_review_kyc(_kyc_id uuid, _action text, _reason text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if not public.has_role(uid, 'admin') then raise exception 'Admin only'; end if;
  if _action = 'approve' then
    update public.kyc_submissions set status = 'approved', reviewed_at = now(), reviewed_by = uid, rejection_reason = null
    where id = _kyc_id;
  elsif _action = 'reject' then
    update public.kyc_submissions set status = 'rejected', reviewed_at = now(), reviewed_by = uid, rejection_reason = _reason
    where id = _kyc_id;
  else
    raise exception 'Invalid action';
  end if;
end;
$$;

-- bootstrap first admin
create or replace function public.bootstrap_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.user_roles where role = 'admin') = 0 then
    insert into public.user_roles (user_id, role) values (new.user_id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_bootstrap_first_admin
  after insert on public.user_roles
  for each row execute function public.bootstrap_first_admin();

-- leaderboard view
create or replace view public.leaderboard
with (security_invoker = true)
as
select
  p.id as user_id,
  p.full_name,
  p.country,
  coalesce(count(r.id) filter (where r.status = 'active'), 0) as active_referrals,
  coalesce(count(r.id), 0) as total_referrals,
  coalesce(w.referral_earnings, 0) as referral_earnings
from public.profiles p
left join public.referrals r on r.referrer_id = p.id
left join public.wallets w on w.user_id = p.id
group by p.id, p.full_name, p.country, w.referral_earnings;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.wallets enable row level security;
alter table public.mining_sessions enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_bonuses enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.app_settings enable row level security;

create policy "public read profiles" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "admins update profiles" on public.profiles for update using (public.has_role(auth.uid(), 'admin'));

create policy "users view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "users view own wallet" on public.wallets for select using (auth.uid() = user_id);
create policy "admins view wallets" on public.wallets for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins update wallets" on public.wallets for update using (public.has_role(auth.uid(), 'admin'));

create policy "users view own mining" on public.mining_sessions for select using (auth.uid() = user_id);
create policy "admins view mining" on public.mining_sessions for select using (public.has_role(auth.uid(), 'admin'));

create policy "users view own referrals" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "admins view referrals" on public.referrals for select using (public.has_role(auth.uid(), 'admin'));

create policy "users view own bonuses" on public.referral_bonuses for select using (auth.uid() = referrer_id);
create policy "admins view bonuses" on public.referral_bonuses for select using (public.has_role(auth.uid(), 'admin'));

create policy "users view own kyc" on public.kyc_submissions for select using (auth.uid() = user_id);
create policy "users insert own kyc" on public.kyc_submissions for insert with check (auth.uid() = user_id);
create policy "admins view kyc" on public.kyc_submissions for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins update kyc" on public.kyc_submissions for update using (public.has_role(auth.uid(), 'admin'));

create policy "users view own withdrawals" on public.withdrawal_requests for select using (auth.uid() = user_id);
create policy "admins view withdrawals" on public.withdrawal_requests for select using (public.has_role(auth.uid(), 'admin'));
create policy "admins update withdrawals" on public.withdrawal_requests for update using (public.has_role(auth.uid(), 'admin'));

create policy "anyone reads settings" on public.app_settings for select using (true);
create policy "admins write settings" on public.app_settings for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy "users upload own kyc" on storage.objects for insert
  with check (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users read own kyc" on storage.objects for select
  using (bucket_id = 'kyc-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "admins read all kyc" on storage.objects for select
  using (bucket_id = 'kyc-documents' and public.has_role(auth.uid(), 'admin'));