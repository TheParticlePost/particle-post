-- ============================================================
-- Migration 005: Affiliate links management
-- ============================================================

create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  url text not null,
  product_name text,
  commission_rate text,
  active boolean not null default true,
  max_insertions_per_article int not null default 1,
  clicks int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table affiliate_links enable row level security;
create policy "Admin read affiliate links" on affiliate_links for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "Admin write affiliate links" on affiliate_links for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
-- Public read for runtime insertion (MDX plugin needs to read)
create policy "Public read active affiliate links" on affiliate_links for select
  using (active = true);

create index idx_affiliate_links_keyword on affiliate_links (keyword) where active = true;
