/**
 * Maps an AI adoption percentage (0–100) to a vermillion opacity value
 * for the world map heatmap. Higher adoption = more intense vermillion.
 *
 * Minimum non-zero opacity is 0.18 — any lower and low-adoption countries
 * (0–20%) become invisible against a light cream page background. The
 * floor intentionally sacrifices heatmap granularity for basic
 * readability: a country with 10% adoption still needs to look like a
 * country, not like empty space.
 */
export function adoptionToOpacity(rate: number | null): number {
  if (rate === null || rate === undefined) return 0;
  if (rate <= 0) return 0;
  if (rate <= 20) return 0.18;
  if (rate <= 40) return 0.30;
  if (rate <= 60) return 0.45;
  if (rate <= 80) return 0.60;
  return 0.78;
}

/**
 * Returns a fill color string for a given adoption rate.
 * Used as fill color for SVG country paths on the map.
 *
 * For countries with no data, returns `var(--map-land)` — a dedicated
 * CSS variable that adapts to light/dark theme while maintaining
 * visible contrast against the page background in both modes. Using
 * `--bg-high` (the previous value) made no-data countries invisible in
 * light mode because the two colors are nearly identical.
 */
export function adoptionToColor(rate: number | null): string {
  const opacity = adoptionToOpacity(rate);
  if (opacity === 0) return "var(--map-land)";
  return `rgba(232, 85, 46, ${opacity})`;
}
