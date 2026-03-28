/**
 * Maps an AI adoption percentage (0–100) to a vermillion opacity value
 * for the world map heatmap. Higher adoption = more intense vermillion.
 */
export function adoptionToOpacity(rate: number | null): number {
  if (rate === null || rate === undefined) return 0;
  if (rate <= 0) return 0;
  if (rate <= 20) return 0.08;
  if (rate <= 40) return 0.18;
  if (rate <= 60) return 0.30;
  if (rate <= 80) return 0.50;
  return 0.70;
}

/**
 * Returns an rgba vermillion string for a given adoption rate.
 * Used as fill color for SVG country paths on the map.
 */
export function adoptionToColor(rate: number | null): string {
  const opacity = adoptionToOpacity(rate);
  if (opacity === 0) return "var(--bg-high)";
  return `rgba(232, 85, 46, ${opacity})`;
}
