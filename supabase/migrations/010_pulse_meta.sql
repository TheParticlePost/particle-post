-- ============================================================
-- 010_pulse_meta.sql — Pulse dashboard freshness tracking
-- ============================================================
--
-- Singleton row table that tracks the last successful Pulse refresh.
-- The Pulse hero reads `last_refreshed_at` to render the
-- "Refreshed [date] · Updated weekly" line so visitors can verify the
-- snapshot is current.
--
-- Schema is intentionally tiny — id is hard-coded to 1, no FK or
-- relations. Public read so it can be fetched server-side without auth.
-- Writes are restricted to the service role (used by the refresh
-- pipeline).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pulse_meta (
    id INT PRIMARY KEY DEFAULT 1,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_count INT NOT NULL DEFAULT 0,
    refresh_status TEXT DEFAULT 'idle',
    refresh_notes TEXT,
    -- enforce singleton: only id=1 is ever allowed
    CONSTRAINT pulse_meta_singleton CHECK (id = 1)
);

INSERT INTO public.pulse_meta (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.pulse_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_meta public read"
    ON public.pulse_meta
    FOR SELECT
    USING (true);

-- Writes only via service-role key (which bypasses RLS by design).
-- No INSERT/UPDATE/DELETE policies — RLS denies anon/authenticated by default.
