-- Pulse Dashboard Tables
-- AI adoption data, industry ROI, case studies, trends, red flags

-- Country-level AI adoption by year
CREATE TABLE IF NOT EXISTS pulse_adoption_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  country_name TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2015 AND year <= 2035),
  adoption_rate NUMERIC(5,2),
  spend_billions NUMERIC(10,2),
  enterprise_pct NUMERIC(5,2),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, year)
);

CREATE INDEX idx_adoption_country_year ON pulse_adoption_data(country_code, year);
CREATE INDEX idx_adoption_year ON pulse_adoption_data(year);

-- Industry ROI multipliers
CREATE TABLE IF NOT EXISTS pulse_industry_roi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  roi_multiplier NUMERIC(5,2),
  median_payback_months INTEGER,
  sample_size INTEGER,
  year INTEGER NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(industry, year)
);

-- Case studies with geographic coordinates
CREATE TABLE IF NOT EXISTS pulse_case_studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  industry TEXT NOT NULL,
  headline TEXT NOT NULL,
  outcome_metric TEXT NOT NULL,
  outcome_value NUMERIC(10,2),
  slug TEXT,
  image_url TEXT,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_case_studies_country ON pulse_case_studies(country_code);
CREATE INDEX idx_case_studies_featured ON pulse_case_studies(featured) WHERE featured = TRUE;

-- Risk indicators / red flags
CREATE TABLE IF NOT EXISTS pulse_red_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_red_flags_active ON pulse_red_flags(active, date DESC) WHERE active = TRUE;

-- Flexible time-series trends
CREATE TABLE IF NOT EXISTS pulse_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'percent',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_name, date)
);

CREATE INDEX idx_trends_metric_date ON pulse_trends(metric_name, date);

-- Denormalized sidebar snapshot (fast reads)
CREATE TABLE IF NOT EXISTS pulse_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  numeric_value NUMERIC(12,2),
  trend TEXT NOT NULL CHECK (trend IN ('up', 'down', 'neutral')),
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshot_order ON pulse_snapshot(display_order);

-- RLS: Public read, admin write
ALTER TABLE pulse_adoption_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_industry_roi ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_snapshot ENABLE ROW LEVEL SECURITY;

-- Public SELECT policies
CREATE POLICY "Public read pulse_adoption_data" ON pulse_adoption_data FOR SELECT USING (true);
CREATE POLICY "Public read pulse_industry_roi" ON pulse_industry_roi FOR SELECT USING (true);
CREATE POLICY "Public read pulse_case_studies" ON pulse_case_studies FOR SELECT USING (true);
CREATE POLICY "Public read pulse_red_flags" ON pulse_red_flags FOR SELECT USING (true);
CREATE POLICY "Public read pulse_trends" ON pulse_trends FOR SELECT USING (true);
CREATE POLICY "Public read pulse_snapshot" ON pulse_snapshot FOR SELECT USING (true);
