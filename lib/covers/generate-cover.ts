/**
 * Main cover generator. Dispatches to the correct mode template and
 * delegates rendering to the Playwright renderer.
 */

import path from "node:path";
import { CoverConfig, FORMAT_DIMENSIONS, OutputFormat } from "./types";
import { renderHtmlToPng, wrapHtml } from "./renderer";
import { renderBigStat } from "./templates/big-stat";
import { renderHeadlineHook } from "./templates/headline-hook";
import { renderComparison } from "./templates/comparison";
import { renderFramework } from "./templates/framework";
import { renderBackgroundImage } from "./templates/background-image";

async function renderBody(config: CoverConfig): Promise<string> {
  switch (config.coverMode) {
    case "big-stat":
      return renderBigStat(config);
    case "headline-hook":
      return renderHeadlineHook(config);
    case "comparison":
      return renderComparison(config);
    case "framework":
      return renderFramework(config);
    case "background-image":
      return await renderBackgroundImage(config);
    default:
      throw new Error(`Unknown coverMode: ${(config as any).coverMode}`);
  }
}

export async function generateCover(
  config: CoverConfig,
  outputDir: string = path.resolve(process.cwd(), "public", "covers"),
): Promise<string[]> {
  const body = await renderBody(config);
  const html = wrapHtml(body);
  const formats: OutputFormat[] = (config.formats && config.formats.length > 0)
    ? config.formats
    : ["og-linkedin"];

  const outputs: string[] = [];
  for (const fmt of formats) {
    const dims = FORMAT_DIMENSIONS[fmt];
    if (!dims) {
      throw new Error(`Unknown format: ${fmt}`);
    }
    const outPath = path.join(outputDir, `${config.slug}-${fmt}.png`);
    await renderHtmlToPng(html, outPath, dims.width, dims.height);
    outputs.push(outPath);
  }
  return outputs;
}
