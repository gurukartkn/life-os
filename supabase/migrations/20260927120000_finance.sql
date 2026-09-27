-- v2 Stage 5b: Finance. Accounts and categories are per-user labels (never real
-- account numbers); amounts are whole paise in a bigint, rupees only. Every child
-- row points at its parent with a composite (id, user_id) foreign key, so a row can
-- only reference the same user's account, category or recurring item. No triggers:
-- updated_at is set by the Server Actions. Rollback:
-- supabase/rollbacks/20260927120000_finance.down.sql.

begin;
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_accounts_id_user_key unique (id, user_id)
);
create unique index if not exists finance_accounts_user_id_lower_name_key
  on public.finance_accounts (user_id, lower(name));
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_categories_id_user_key unique (id, user_id)
);
create unique index if not exists finance_categories_user_id_lower_name_key
  on public.finance_categories (user_id, lower(name));
create table if not exists public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  kind text not null check (kind in ('expense', 'income')),
  amount_paise bigint not null check (amount_paise > 0),
  account_id uuid not null,
  category_id uuid not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  anchor_day smallint not null check (anchor_day between 1 and 31),
  next_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_items_id_user_key unique (id, user_id),
  constraint recurring_items_account_fkey foreign key (account_id, user_id)
    references public.finance_accounts (id, user_id),
  constraint recurring_items_category_fkey foreign key (category_id, user_id)
    references public.finance_categories (id, user_id)
);
create index if not exists recurring_items_user_next_idx
  on public.recurring_items (user_id, next_on) where is_active;
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('expense', 'income')),
  amount_paise bigint not null check (amount_paise > 0),
  account_id uuid not null,
  category_id uuid,
  note text check (note is null or length(note) <= 500),
  source text not null default 'manual' check (source in ('manual', 'csv', 'recurring')),
  import_batch_id uuid,
  recurring_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_account_fkey foreign key (account_id, user_id)
    references public.finance_accounts (id, user_id),
  constraint transactions_category_fkey foreign key (category_id, user_id)
    references public.finance_categories (id, user_id),
  constraint transactions_recurring_item_fkey foreign key (recurring_item_id, user_id)
    references public.recurring_items (id, user_id) on delete set null (recurring_item_id),
  constraint transactions_import_batch_check check ((source = 'csv') = (import_batch_id is not null))
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index if not exists transactions_account_date_amount_idx on public.transactions (account_id, occurred_on, amount_paise);
create index if not exists transactions_category_idx on public.transactions (category_id) where category_id is not null;
create index if not exists transactions_recurring_item_idx on public.transactions (recurring_item_id) where recurring_item_id is not null;
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount_paise bigint not null check (amount_paise > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_user_category_key unique (user_id, category_id),
  constraint budgets_category_fkey foreign key (category_id, user_id)
    references public.finance_categories (id, user_id) on delete cascade
);
do $$
declare t text;
begin
  foreach t in array array['finance_accounts', 'finance_categories', 'recurring_items', 'transactions', 'budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows only" on public.%I', t);
    execute format('create policy "own rows only" on public.%I for all to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
commit;
