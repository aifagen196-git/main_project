-- supabase/migrations/0024_manual_payments.sql
--
-- Payments taken outside Razorpay (cash, bank transfer, UPI, …), recorded by
-- an admin on the Payments page. Each row is one agreed charge: the total
-- due, how much has been paid so far, and the balance still owed. Partial
-- payments are recorded by raising amount_paid; the balance and status follow
-- automatically.
--
-- Only the backend (service role) reads or writes this table — the admin app
-- goes through /api/admin/manual-payments. Safe to re-run.

create table if not exists public.manual_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  payer_name    text not null,
  payer_email   text,
  payer_phone   text,
  description   text,                                   -- what it's for, e.g. "Premium plan"
  method        text not null default 'cash'
                check (method in ('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other')),
  currency      text not null default 'USD',
  total_amount  numeric(12, 2) not null check (total_amount > 0),
  amount_paid   numeric(12, 2) not null default 0 check (amount_paid >= 0),
  balance       numeric(12, 2) generated always as (greatest(total_amount - amount_paid, 0)) stored,
  status        text generated always as (
                  case
                    when amount_paid <= 0 then 'unpaid'
                    when amount_paid < total_amount then 'partial'
                    else 'paid'
                  end
                ) stored,
  due_date      date,                                   -- when the balance is expected
  paid_on       date,                                   -- date of the latest payment received
  note          text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint manual_payments_paid_not_over check (amount_paid <= total_amount)
);

create index if not exists manual_payments_created_idx on public.manual_payments (created_at desc);
create index if not exists manual_payments_status_idx on public.manual_payments (status);
create index if not exists manual_payments_user_idx on public.manual_payments (user_id);

-- Nobody but the backend touches this table.
alter table public.manual_payments enable row level security;
revoke all on table public.manual_payments from anon, authenticated;
