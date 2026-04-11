/**
 * DEPRECATED — the BeforeAfter card component has been banned.
 *
 * The writer prompt (pipeline/prompts/writer_backstory.txt) forbids the
 * `{{< before-after >}}` shortcode, the article assembler's
 * _strip_banned_visuals() removes any that slip through, and the QA gate's
 * check 19 rejects articles that contain the shortcode or the legacy
 * auto-generated `![Before After visualization](...png)` image tag.
 *
 * This file is kept only so the remark-hugo-shortcodes plugin's
 * auto-generated `<BeforeAfter />` JSX doesn't throw a missing-component
 * error if a legacy article somehow still renders the shortcode in a
 * cached build. Returns null so the component is effectively invisible.
 *
 * Replace before/after comparisons with either:
 *   - A {{< bar-chart >}} with two bars (before state, after state)
 *   - Plain prose naming both numbers inline
 *
 * See writer_backstory.txt BEFORE / AFTER CARD — BANNED section.
 */
interface BeforeAfterProps {
  metric?: string;
  before?: string;
  after?: string;
  source?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BeforeAfter(_props: BeforeAfterProps) {
  return null;
}
