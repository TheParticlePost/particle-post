import { CoverConfig, ComparisonSide } from "../types";
import { buildFrameParts, escapeHtml } from "./frame";

function renderSide(side: ComparisonSide, isRight: boolean): string {
  const sideClass = isRight
    ? "mode-comparison__side mode-comparison__side--right"
    : "mode-comparison__side";
  return `<div class="${sideClass}">
    <h2 class="mode-comparison__name">${escapeHtml(side.name)}</h2>
    <p class="mode-comparison__metric">${escapeHtml(side.metric)}</p>
    <p class="mode-comparison__detail">${escapeHtml(side.detail)}</p>
  </div>`;
}

export function renderComparison(config: CoverConfig): string {
  if (!config.comparisonLeft || !config.comparisonRight) {
    throw new Error("comparison mode requires `comparisonLeft` and `comparisonRight`");
  }
  const frame = buildFrameParts(config);
  return `<div class="cover">
    ${frame.accentStripe}
    ${frame.category}
    <div class="cover__inner">
      <div class="mode-comparison">
        ${renderSide(config.comparisonLeft, false)}
        <div class="mode-comparison__divider">
          <span class="mode-comparison__vs">VS</span>
        </div>
        ${renderSide(config.comparisonRight, true)}
      </div>
    </div>
    ${frame.wordmark}
    ${frame.date}
  </div>`;
}
