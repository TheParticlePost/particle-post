-- ============================================================
-- 007_specialists.sql — AI Specialist Marketplace tables
-- ============================================================

-- Specialists: core profile linked to auth.users via profiles
CREATE TABLE specialists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'firm')),
    display_name TEXT NOT NULL,
    headline TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    industries TEXT[] DEFAULT '{}',
    location_city TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'US',
    languages TEXT[] DEFAULT '{en}',
    hourly_rate_range TEXT,
    team_size TEXT,
    certifications TEXT[] DEFAULT '{}',
    linkedin_url TEXT NOT NULL,
    website_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    avg_rating FLOAT DEFAULT 0,
    total_reviews INT DEFAULT 0,
    profile_views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT specialists_user_unique UNIQUE (user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_specialist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER specialists_updated_at
    BEFORE UPDATE ON specialists
    FOR EACH ROW
    EXECUTE FUNCTION update_specialist_updated_at();

-- Indexes
CREATE INDEX idx_specialists_status ON specialists(status);
CREATE INDEX idx_specialists_categories ON specialists USING gin(categories);
CREATE INDEX idx_specialists_country ON specialists(country_code);
CREATE INDEX idx_specialists_slug ON specialists(slug);
CREATE INDEX idx_specialists_user ON specialists(user_id);

-- Full-text search index
CREATE INDEX idx_specialists_search ON specialists USING gin(
    to_tsvector('english', display_name || ' ' || headline || ' ' || COALESCE(bio, ''))
);

-- RLS
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- Public: anyone can read approved specialists
CREATE POLICY "Approved specialists are public"
    ON specialists FOR SELECT
    USING (status = 'approved');

-- Owner: can always read own profile (any status)
CREATE POLICY "Users can read own specialist profile"
    ON specialists FOR SELECT
    USING (auth.uid() = user_id);

-- Owner: can insert own profile
CREATE POLICY "Users can create own specialist profile"
    ON specialists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Owner: can update own profile (but not status/verified/featured)
CREATE POLICY "Users can update own specialist profile"
    ON specialists FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND status = (SELECT s.status FROM specialists s WHERE s.id = specialists.id)
        AND is_verified = (SELECT s.is_verified FROM specialists s WHERE s.id = specialists.id)
        AND is_featured = (SELECT s.is_featured FROM specialists s WHERE s.id = specialists.id)
    );

-- Admin: full access
CREATE POLICY "Admins have full access to specialists"
    ON specialists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- Portfolio items
-- ============================================================
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    external_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_portfolio_specialist ON portfolio_items(specialist_id);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Public: readable if parent specialist is approved
CREATE POLICY "Portfolio items of approved specialists are public"
    ON portfolio_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = portfolio_items.specialist_id
            AND specialists.status = 'approved'
        )
    );

-- Owner can read own (any status)
CREATE POLICY "Specialists can read own portfolio"
    ON portfolio_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = portfolio_items.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

-- Owner can manage own
CREATE POLICY "Specialists can manage own portfolio"
    ON portfolio_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = portfolio_items.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

-- Admin: full access
CREATE POLICY "Admins have full access to portfolio items"
    ON portfolio_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- Reviews
-- ============================================================
CREATE TABLE specialist_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
    reviewer_name TEXT NOT NULL,
    reviewer_email TEXT NOT NULL,
    reviewer_company TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_specialist ON specialist_reviews(specialist_id);
CREATE INDEX idx_reviews_status ON specialist_reviews(status);

ALTER TABLE specialist_reviews ENABLE ROW LEVEL SECURITY;

-- Public: approved reviews of approved specialists
CREATE POLICY "Approved reviews are public"
    ON specialist_reviews FOR SELECT
    USING (
        status = 'approved'
        AND EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = specialist_reviews.specialist_id
            AND specialists.status = 'approved'
        )
    );

-- Anyone can submit a review
CREATE POLICY "Anyone can submit a review"
    ON specialist_reviews FOR INSERT
    WITH CHECK (true);

-- Specialist owner can read all reviews on their profile
CREATE POLICY "Specialists can read own reviews"
    ON specialist_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = specialist_reviews.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

-- Admin: full access
CREATE POLICY "Admins have full access to reviews"
    ON specialist_reviews FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================
-- Leads (contact submissions)
-- ============================================================
CREATE TABLE specialist_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_company TEXT,
    project_description TEXT NOT NULL,
    budget_range TEXT,
    timeline TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'responded', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_specialist ON specialist_leads(specialist_id);
CREATE INDEX idx_leads_status ON specialist_leads(status);

ALTER TABLE specialist_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (rate-limited at API layer)
CREATE POLICY "Anyone can submit a lead"
    ON specialist_leads FOR INSERT
    WITH CHECK (true);

-- Specialist owner can read and update own leads
CREATE POLICY "Specialists can read own leads"
    ON specialist_leads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = specialist_leads.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

CREATE POLICY "Specialists can update own leads"
    ON specialist_leads FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM specialists
            WHERE specialists.id = specialist_leads.specialist_id
            AND specialists.user_id = auth.uid()
        )
    );

-- Admin: full access
CREATE POLICY "Admins have full access to leads"
    ON specialist_leads FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
