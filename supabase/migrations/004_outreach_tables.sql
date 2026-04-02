-- ============================================================
-- Migration 004: Outreach campaign tables
-- ============================================================

-- Outreach campaigns
create table if not exists outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now()
);

alter table outreach_campaigns enable row level security;
create policy "Admin read outreach campaigns" on outreach_campaigns for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "Admin write outreach campaigns" on outreach_campaigns for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Outreach targets (sites to reach out to)
create table if not exists outreach_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  site_url text not null,
  site_name text,
  contact_email text,
  contact_name text,
  broken_link_url text,
  our_replacement_url text,
  status text not null default 'discovered'
    check (status in ('discovered', 'emailed', 'followed_up', 'replied', 'won', 'lost', 'ignored')),
  created_at timestamptz not null default now()
);

alter table outreach_targets enable row level security;
create policy "Admin read outreach targets" on outreach_targets for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "Admin write outreach targets" on outreach_targets for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create index idx_outreach_targets_campaign on outreach_targets (campaign_id);
create index idx_outreach_targets_status on outreach_targets (status);

-- Outreach emails (sent emails with tracking)
create table if not exists outreach_emails (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references outreach_targets(id) on delete cascade,
  sequence_step int not null default 1,
  subject text not null,
  body_html text not null,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  resend_id text,
  created_at timestamptz not null default now()
);

alter table outreach_emails enable row level security;
create policy "Admin read outreach emails" on outreach_emails for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "Admin write outreach emails" on outreach_emails for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create index idx_outreach_emails_target on outreach_emails (target_id);
create index idx_outreach_emails_sent on outreach_emails (sent_at desc) where sent_at is not null;
