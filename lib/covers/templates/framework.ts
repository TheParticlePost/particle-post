import { CoverConfig } from "../types";
import { buildFrameParts, escapeHtml } from "./frame";

export function renderFramework(config: CoverConfig): string {
  const steps = (config.frameworkSteps || []).slice(0, 5);
  if (steps.length < 3) {
    throw new Error("framework mode requires at least 3 `frameworkSteps`");
  }

  const stepsHtml = steps
    .map((label, i) => {
      const stepHtml = `<div class="mode-framework__step">
        <div class="mode-framework__node">${i + 1}</div>
        <div class="mode-framework__label">${escapeHtml(label)}</div>
      </div>`;
      const connector =
        i < steps.length - 1 ? `<div class="mode-framework__connector"></div>` : "";
      return stepHtml + connector;
    })
    .join("");

  const frameworkName = config.frameworkName
    ? `<h2 class="mode-framework__name">${escapeHtml(config.frameworkName)}</h2>`
    : "";

  const frame = buildFrameParts(config);
  return `<div class="cover">
    ${frame.accentStripe}
    ${frame.category}
    <div class="cover__inner">
      <div class="mode-framework">
        ${frameworkName}
        <div class="mode-framework__flow">
          ${stepsHtml}
        </div>
      </div>
    </div>
    ${frame.wordmark}
    ${frame.date}
  </div>`;
}
