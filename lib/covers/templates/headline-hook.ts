import { CoverConfig } from "../types";
import { buildFrameParts, escapeHtml } from "./frame";

function hookSizeClass(text: string): string {
  const len = text.length;
  if (len <= 22) return "mode-headline-hook__text mode-headline-hook__text--short";
  if (len >= 52) return "mode-headline-hook__text mode-headline-hook__text--long";
  return "mode-headline-hook__text";
}

export function renderHeadlineHook(config: CoverConfig): string {
  if (!config.hookText) {
    throw new Error("headline-hook mode requires `hookText`");
  }
  const frame = buildFrameParts(config);
  return `<div class="cover">
    ${frame.accentStripe}
    ${frame.category}
    <div class="cover__inner">
      <div class="mode-headline-hook">
        <div class="mode-headline-hook__stripe"></div>
        <h1 class="${hookSizeClass(config.hookText)}">${escapeHtml(config.hookText)}</h1>
      </div>
    </div>
    ${frame.wordmark}
    ${frame.date}
  </div>`;
}
