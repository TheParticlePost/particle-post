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

export function convertHugoShortcodes(content: string): string {
  return content.replace(SHORTCODE_RE, (_match, name: string, params: string) => {
    const componentName = kebabToPascal(name);
    // params already contains key="value" pairs which are valid JSX
    return `<${componentName} ${params.trim()} />`;
  });
}
