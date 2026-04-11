-- ============================================================
-- 009_seed_specialist.sql — Demo specialist for admin preview
-- ============================================================
--
-- Inserts a single placeholder specialist row so administrators can preview
-- the directory layout while real specialists are being onboarded. The row
-- attaches to the FIRST admin user found in `profiles` (admins are bound to
-- be present before this migration is meaningful — the page is only
-- visible to them anyway).
--
-- Idempotent: ON CONFLICT DO NOTHING covers both the slug uniqueness and
-- the user_id uniqueness constraints.
--
-- Safe to delete the row manually once 1+ real specialists go live:
--   delete from public.specialists where slug = 'demo-ai-implementation-partner';
-- ============================================================

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find any admin to attach the demo specialist to. Order by creation
    -- so the same admin is picked across re-runs.
    SELECT id INTO admin_user_id
    FROM public.profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    IF admin_user_id IS NULL THEN
        RAISE NOTICE '009_seed_specialist: no admin profile found, skipping demo insert';
        RETURN;
    END IF;

    INSERT INTO public.specialists (
        user_id,
        slug,
        type,
        display_name,
        headline,
        bio,
        categories,
        industries,
        location_city,
        country_code,
        languages,
        hourly_rate_range,
        team_size,
        certifications,
        linkedin_url,
        website_url,
        is_available,
        is_verified,
        is_featured,
        status,
        avg_rating,
        total_reviews
    ) VALUES (
        admin_user_id,
        'demo-ai-implementation-partner',
        'individual',
        'Demo AI Implementation Partner',
        'Placeholder profile for admin preview during the Coming Soon phase',
        E'This is a demo profile created by migration 009 so administrators can preview the directory layout before real specialists are onboarded. It is safe to delete once 1+ real specialists go live:\n\n  DELETE FROM public.specialists WHERE slug = ''demo-ai-implementation-partner'';',
        ARRAY['LLM Implementation', 'Process Automation', 'AI Strategy'],
        ARRAY['Financial Services', 'SaaS'],
        'Montréal',
        'CA',
        ARRAY['en', 'fr'],
        '$150-$300/hr',
        '1-5',
        ARRAY['AWS Certified ML Specialty'],
        'https://www.linkedin.com/in/example/',
        NULL,
        true,
        true,
        true,
        'approved',
        4.8,
        12
    )
    ON CONFLICT DO NOTHING;
END$$;
