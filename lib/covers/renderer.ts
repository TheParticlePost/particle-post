/**
 * Playwright-based HTML→PNG renderer for covers.
 * Mirrors the font-loading pattern from pipeline/graphics/renderer.py.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const FONTS_DIR = path.join(PROJECT_ROOT, "public", "fonts");
const FONTS_URI = pathToFileURL(FONTS_DIR).href; // file:///C:/.../public/fonts

const CSS_PATH = path.join(__dirname, "styles", "cover.css");

function loadSharedCss(): string {
  return fs.readFileSync(CSS_PATH, "utf-8");
}

function fontFaceBlock(): string {
  return `
  @font-face {
    font-family: 'Sora';
    src: url('${FONTS_URI}/Sora-Bold.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('${FONTS_URI}/DMSans-Regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('${FONTS_URI}/DMSans-Medium.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('${FONTS_URI}/DMSans-SemiBold.woff2') format('woff2');
    font-weight: 600;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    src: url('${FONTS_URI}/IBMPlexMono-Regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    src: url('${FONTS_URI}/IBMPlexMono-Medium.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: block;
  }`;
}

/**
 * Wrap a body fragment in a full HTML document with font + CSS loaded.
 */
export function wrapHtml(bodyFragment: string): string {
  const css = loadSharedCss();
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
${fontFaceBlock()}
${css}
</style></head><body>${bodyFragment}</body></html>`;
}

/**
 * Render an HTML document to a PNG file via headless Chromium.
 */
export async function renderHtmlToPng(
  html: string,
  outputPath: string,
  width: number,
  height: number,
): Promise<string> {
  let chromium;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    chromium = require("playwright").chromium;
  } catch {
    throw new Error(
      "Playwright is not installed. Run:\n" +
        "  npm install -D playwright && npx playwright install chromium",
    );
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // Give the browser time to parse @font-face and finish layout.
    // Background images are embedded as base64 data URIs by the
    // background-image template, so they decode synchronously.
    await page.waitForTimeout(500);
    // Ensure output dir exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, type: "png", omitBackground: false });
  } finally {
    await browser.close();
  }

  return outputPath;
}
