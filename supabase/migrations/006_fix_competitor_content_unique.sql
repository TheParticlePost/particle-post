-- ============================================================
-- Migration 006: Add unique constraint on competitor_content.url
-- Required for upsert (onConflict: "url") to work correctly
-- ============================================================

alter table competitor_content
  add constraint competitor_content_url_unique unique (url);
