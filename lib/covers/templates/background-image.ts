import { CoverConfig } from "../types";
import { buildFrameParts, escapeHtml } from "./frame";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";
import { generateBackground as geminiGenerate } from "../gemini/client";

/** Download a URL to /tmp and return the local path. */
async function downloadToTmp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
    const ext = path.extname(new URL(url).pathname) || ".png";
    const tmpPath = path.join(require("os").tmpdir(), `cover-bg-${hash}${ext}`);
    const client = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(tmpPath);
    client
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(tmpPath);
          downloadToTmp(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(tmpPath);
          reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(tmpPath)));
      })
      .on("error", (err) => {
        file.close();
        try { fs.unlinkSync(tmpPath); } catch {}
        reject(err);
      });
  });
}

async function resolveImagePath(config: CoverConfig): Promise<string> {
  if (config.backgroundImage) {
    const raw = config.backgroundImage;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return downloadToTmp(raw);
    }
    // Local path — verify it exists
    const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
    if (!fs.existsSync(abs)) {
      throw new Error(`backgroundImage not found at ${abs}`);
    }
    return abs;
  }

  if (config.geminiPrompt) {
    return geminiGenerate({ prompt: config.geminiPrompt });
  }

  throw new Error("background-image mode requires `backgroundImage` or `geminiPrompt`");
}

function imageToDataUri(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    ext === ".gif" ? "image/gif" :
    "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function renderBackgroundImage(config: CoverConfig): Promise<string> {
  if (!config.hookText) {
    throw new Error("background-image mode requires `hookText`");
  }
  const imgPath = await resolveImagePath(config);
  // Embed as base64 data URI — Playwright headless Chromium blocks
  // file:// resources loaded from a setContent()'d page (no base URL).
  const imgUri = imageToDataUri(imgPath);

  const frame = buildFrameParts(config);
  const stat = config.hookStat
    ? `<p class="mode-bg-image__stat">${escapeHtml(config.hookStat)}</p>`
    : "";

  return `<div class="cover">
    <div class="mode-bg-image">
      <img class="mode-bg-image__img" src="${imgUri}" alt="" />
      <div class="mode-bg-image__tint"></div>
      <div class="mode-bg-image__overlay"></div>
    </div>
    ${frame.accentStripe}
    ${frame.category}
    <div class="mode-bg-image__content">
      ${stat}
      <h1 class="mode-bg-image__hook">${escapeHtml(config.hookText)}</h1>
    </div>
    ${frame.wordmark}
    ${frame.date}
  </div>`;
}
