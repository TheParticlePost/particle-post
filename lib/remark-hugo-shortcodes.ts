/**
 * Pre-processes Hugo shortcodes in markdown content into JSX components
 * that next-mdx-remote can render.
 *
 * Converts: {{< stat-box number="42%" label="..." source="..." >}}
 * Into:     <StatBox number="42%" label="..." source="..." />
 */

const SHORTCODE_RE = /\{\{<\s*([\w][\w-]*)\s+(.*?)>\}\}/g;

function kebabToPascal(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Auto-link bare URLs that aren't already inside markdown links or HTML tags.
 * Matches URLs starting with http:// or https:// that are NOT preceded by
 * ( or " or [ or = (which would mean they're already in a link context).
 */
const BARE_URL_RE = /(?<![("=[\w])(?:https?:\/\/[^\s)<>,]+)/g;

function autoLinkUrls(content: string): string {
  return content.replace(BARE_URL_RE, (url) => {
    // Don't link URLs already inside markdown links [text](url) or <a> tags
    return `[${url}](${url})`;
  });
}

export function convertHugoShortcodes(content: string): string {
  let processed = content.replace(SHORTCODE_RE, (_match, name: string, params: string) => {
    const componentName = kebabToPascal(name);
    // params already contains key="value" pairs which are valid JSX
    return `<${componentName} ${params.trim()} />`;
  });

  // Auto-link bare URLs (e.g., in ## Sources sections)
  processed = autoLinkUrls(processed);

  return processed;
}
