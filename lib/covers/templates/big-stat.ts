import { CoverConfig } from "../types";
import { buildFrameParts, escapeHtml } from "./frame";

function statSizeClass(stat: string): string {
  const len = stat.length;
  if (len >= 8) return "mode-big-stat__stat mode-big-stat__stat--xlong";
  if (len >= 6) return "mode-big-stat__stat mode-big-stat__stat--long";
  return "mode-big-stat__stat";
}

function renderDelta(stat: string): string {
  const s = stat.trim();
  if (s.startsWith("+")) {
    return `<span class="mode-big-stat__delta mode-big-stat__delta--up">↑</span>`;
  }
  if (s.startsWith("-") || s.startsWith("−")) {
    return `<span class="mode-big-stat__delta mode-big-stat__delta--down">↓</span>`;
  }
  return "";
}

export function renderBigStat(config: CoverConfig): string {
  if (!config.hookStat) {
    throw new Error("big-stat mode requires `hookStat`");
  }
  const frame = buildFrameParts(config);
  const stat = escapeHtml(config.hookStat);
  const context = config.hookContext
    ? `<p class="mode-big-stat__context">${escapeHtml(config.hookContext)}</p>`
    : "";

  return `<div class="cover">
    ${frame.accentStripe}
    ${frame.category}
    <div class="cover__inner">
      <div class="${statSizeClass(config.hookStat)}">
        <span>${stat}</span>
        ${renderDelta(config.hookStat)}
      </div>
      ${context}
    </div>
    ${frame.wordmark}
    ${frame.date}
  </div>`;
}
