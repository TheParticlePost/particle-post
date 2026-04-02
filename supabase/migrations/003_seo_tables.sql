-- ============================================================
-- Migration 003: SEO, Competitors, and Site Health tables
-- ============================================================

-- Site health audit reports
create table if not exists site_health_reports (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  total_pages int not null default 0,
  broken_links jsonb not null default '[]'::jsonb,
  missing_meta jsonb not null default '[]'::jsonb,
  missing_alt jsonb not null default '[]'::jsonb,
  schema_errors jsonb not null default '[]'::jsonb,
  slow_pages jsonb not null default '[]'::jsonb,
  score int not null default 0,
  created_at timestamptz not null default now()
);

alter table site_health_reports enable row level security;
create policy "Public read site health" on site_health_reports for select using (true);
create policy "Admin insert site health" on site_health_reports for insert
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create index idx_site_health_run_at on site_health_reports (run_at desc);

-- Broken backlinks (inbound links to us that are broken)
create table if not exists broken_backlinks (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_domain text not null,
  target_url text not null,
  anchor_text text,
  status_code int,
  discovered_at timestamptz not null default now(),
  action text not null default 'pending'
    check (action in ('pending', 'redirected', 'reclaimed', 'ignored')),
  competitor_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

alter table broken_backlinks enable row level security;
create policy "Public read broken backlinks" on broken_backlinks for select using (true);
create policy "Admin write broken backlinks" on broken_backlinks for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create index idx_broken_backlinks_domain on broken_backlinks (source_domain);
create index idx_broken_backlinks_action on broken_backlinks (action) where action = 'pending';

-- Competitors
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  rss_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table competitors enable row level security;
create policy "Public read competitors" on competitors for select using (true);
create policy "Admin write competitors" on competitors for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- Competitor content (tracked articles from competitor sites)
create table if not exists competitor_content (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,
  title text not null,
  url text not null,
  published_at timestamptz,
  topics text[] not null default '{}',
  discovered_at timestamptz not null default now()
);

alter table competitor_content enable row level security;
create policy "Public read competitor content" on competitor_content for select using (true);
create policy "Admin write competitor content" on competitor_content for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create index idx_competitor_content_competitor on competitor_content (competitor_id);
create index idx_competitor_content_discovered on competitor_content (discovered_at desc);

-- Add foreign key from broken_backlinks to competitors (nullable)
alter table broken_backlinks
  add constraint fk_broken_backlinks_competitor
  foreign key (competitor_id) references competitors(id) on delete set null;

-- Seed the 20 competitors
insert into competitors (name, url) values
  ('CFO Dive', 'https://www.cfodive.com'),
  ('CFO.com', 'https://www.cfo.com'),
  ('The Rundown AI', 'https://therundownai.com'),
  ('Superhuman AI', 'https://superhumanai.com'),
  ('AI Finance Today', 'https://aifinancetoday.com'),
  ('AI Finance Club', 'https://ai-finance.club'),
  ('Houseblend.io', 'https://www.houseblend.io/articles'),
  ('The CFO', 'https://the-cfo.io'),
  ('Concourse.co Blog', 'https://www.concourse.co/insights'),
  ('Gartner Finance', 'https://www.gartner.com/en/articles/agentic-ai-in-finance'),
  ('IMD (I by IMD)', 'https://www.imd.org/ibyimd/artificial-intelligence/'),
  ('Workday Blog', 'https://blog.workday.com'),
  ('PYMNTS.com', 'https://www.pymnts.com'),
  ('Neurons Lab', 'https://neurons-lab.com/article/agentic-ai-in-financial-services-2026/'),
  ('FEI', 'https://www.financialexecutives.org'),
  ('CTMfile', 'https://ctmfile.com'),
  ('Nominal.so Blog', 'https://www.nominal.so/blog/ai-modern-cfo'),
  ('Rydoo CFO Corner', 'https://www.rydoo.com/cfo-corner/agentic-ai-finance/'),
  ('MindBridge Blog', 'https://www.mindbridge.ai/blog/'),
  ('Appinventiv Blog', 'https://appinventiv.com/blog/generative-ai-implementation-guide/')
on conflict (url) do nothing;
