-- ============================================================
-- 008_phase2_specialist_dashboard.sql
-- Specialist dashboard, automatch, analytics
-- ============================================================

-- Add email column to specialists (for notifications)
ALTER TABLE specialists ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================
-- Project briefs (client submits needs for automatch)
-- ============================================================
CREATE TABLE project_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_company TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    industries TEXT[] DEFAULT '{}',
    country_code TEXT DEFAULT 'US',
    languages TEXT[] DEFAULT '{en}',
    budget_range TEXT,
    timeline TEXT,
    project_description TEXT NOT NULL,
    match_count INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    matched_at TIMESTAMPTZ
);

CREATE INDEX idx_briefs_status ON project_briefs(status);
CREATE INDEX idx_briefs_categories ON project_briefs USING gin(categories);
CREATE INDEX idx_briefs_created ON project_briefs(created_at DESC);

ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a brief"
    ON project_briefs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Briefs readable by admin"
    ON project_briefs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- Automatch results (links briefs to specialists with scores)
-- ============================================================
CREATE TABLE automatch_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_id UUID NOT NULL REFERENCES project_briefs(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
    match_score FLOAT NOT NULL DEFAULT 0,
    category_score FLOAT DEFAULT 0,
    geo_score FLOAT DEFAULT 0,
    rating_score FLOAT DEFAULT 0,
    availability_score FLOAT DEFAULT 0,
    language_score FLOAT DEFAULT 0,
    rank INT DEFAULT 0,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT automatch_unique_pair UNIQUE (brief_id, specialist_id)
);

CREATE INDEX idx_automatch_brief ON automatch_results(brief_id);
CREATE INDEX idx_automatch_specialist ON automatch_results(specialist_id);
CREATE INDEX idx_automatch_score ON automatch_results(match_score DESC);

ALTER TABLE automatch_results ENABLE ROW LEVEL SECURITY;

-- Specialists can read their own match results
CREATE POLICY "Specialists can read own matches"
    ON automatch_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = automatch_results.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins have full access to automatch"
    ON automatch_results FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- Specialist analytics events
-- ============================================================
CREATE TABLE specialist_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'profile_view', 'lead_submitted', 'match_received',
        'directory_impression', 'contact_click'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analytics_specialist ON specialist_analytics_events(specialist_id);
CREATE INDEX idx_analytics_type ON specialist_analytics_events(event_type);
CREATE INDEX idx_analytics_created ON specialist_analytics_events(created_at DESC);

ALTER TABLE specialist_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Specialists can read own analytics"
    ON specialist_analytics_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = specialist_analytics_events.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

-- Service role inserts analytics events (from API routes)
CREATE POLICY "Service role can insert analytics"
    ON specialist_analytics_events FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins have full access to analytics"
    ON specialist_analytics_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
