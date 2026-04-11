/**
 * Site-wide string constants.
 *
 * Single source of truth for taglines, thresholds, and other copy that
 * appears in multiple places. Importing from here keeps wording consistent
 * across the homepage, footer, metadata, and About page.
 */

// ─── Taglines ────────────────────────────────────────────────────────────────

/**
 * Long-form tagline used in metadata, footer brand, About page intro.
 * Audience: search engines, first-time visitors who need full context.
 */
export const TAGLINE_LONG =
  "Particle Post helps business leaders implement AI. Twice-daily briefings on strategy, operations, and the decisions that matter.";

/**
 * Short tagline used in tight spaces — footer bottom-right rule.
 * Reinforces the trust positioning in three words.
 */
export const TAGLINE_SHORT = "Research-grade intelligence. Delivered daily.";

// ─── Subscriber claim threshold ──────────────────────────────────────────────

/**
 * Minimum subscriber count before showing the "Join NN+ leaders" social-proof
 * line on the homepage and subscribe page. Below this, we don't make any
 * audience claim — false specificity hurts trust more than absence.
 *
 * Tune this when you're confident the count is real and worth advertising.
 */
export const SUBSCRIBER_COUNT_THRESHOLD = 800;

// ─── Brand contact ───────────────────────────────────────────────────────────

export const CONTACT_EMAIL = "hello@theparticlepost.com";
