-- Rollback for supabase/migrations/20260927120000_finance.sql: drops the five Finance
-- tables, children first. Their policies and indexes go with them. Destroys all
-- Finance data.

begin;
drop table if exists public.budgets;
drop table if exists public.transactions;
drop table if exists public.recurring_items;
drop table if exists public.finance_categories;
drop table if exists public.finance_accounts;
commit;
