/**
 * Thin Gemini 2.5 Flash Image client.
 * Synchronous (no polling) — one API call returns base64 PNG inline.
 * Reads GEMINI_API_KEY from process.env.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export interface GenerateOpts {
  prompt: string;
  model?: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash-image";

// Gemini 2.5 Flash Image pricing (USD per image) as of April 2026.
// Keep in sync with pipeline/utils/gemini_cost.py.
export const GEMINI_IMAGE_PRICE_USD = 0.039;

// Module-level usage accumulator. Reset via resetUsage() at the start of
// each CLI invocation. CLI reads via getUsage() and emits in stdout JSON
// so Python can merge it into the main cost log.
interface GeminiUsage {
  imageCount: number;
  estimatedCostUsd: number;
}

const usage: GeminiUsage = { imageCount: 0, estimatedCostUsd: 0 };

export function getUsage(): GeminiUsage {
  return { ...usage };
}

export function resetUsage(): void {
  usage.imageCount = 0;
  usage.estimatedCostUsd = 0;
}

/** Build the deterministic cache path for a (model, prompt) tuple. */
function cachePath(model: string, prompt: string): string {
  const hash = crypto
    .createHash("sha1")
    .update(model + "\n" + prompt)
    .digest("hex")
    .slice(0, 12);
  return path.join(os.tmpdir(), `gemini-${hash}.png`);
}

/**
 * Generate a background image via Gemini and write it to /tmp.
 * Returns the absolute path to the PNG.
 *
 * Caching: hashed by (model + prompt). On a cache hit, the existing file
 * is returned without calling the API and `usage` is NOT incremented.
 * This makes backfill resumes / retries free, while new article runs
 * (with unique titles) effectively never hit the cache.
 */
export async function generateBackground(opts: GenerateOpts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Export it in your shell or add it to .env.",
    );
  }

  const model = opts.model || DEFAULT_MODEL;
  const outPath = cachePath(model, opts.prompt);

  // Cache hit — skip the API entirely and DO NOT bill.
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    return outPath;
  }

  let GoogleGenAI: typeof import("@google/genai").GoogleGenAI;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ GoogleGenAI } = require("@google/genai"));
  } catch {
    throw new Error(
      "@google/genai is not installed. Run:\n  npm install @google/genai",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: opts.prompt,
  });

  // Walk the candidates for an inline image part
  const candidates = (response as any).candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      const inline = part?.inlineData;
      if (inline?.data && typeof inline.mimeType === "string" && inline.mimeType.startsWith("image/")) {
        fs.writeFileSync(outPath, Buffer.from(inline.data, "base64"));
        usage.imageCount += 1;
        usage.estimatedCostUsd += GEMINI_IMAGE_PRICE_USD;
        return outPath;
      }
    }
  }

  // No image found — surface any text part for debugging
  const textParts: string[] = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      if (typeof part?.text === "string") textParts.push(part.text);
    }
  }
  throw new Error(
    "Gemini returned no image. Text parts: " +
      (textParts.join(" | ") || "(none)"),
  );
}
