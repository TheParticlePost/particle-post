#!/usr/bin/env tsx
/**
 * CLI entry point for cover generation.
 * Usage:
 *   npx tsx lib/covers/cli.ts --config ./cover-config.json --output ./public/covers/
 *
 * On success prints JSON {"paths": ["/abs/path/slug-og-linkedin.png"]} to stdout.
 * On failure prints JSON {"error": "..."} to stderr and exits 1.
 */

import fs from "node:fs";
import path from "node:path";
import { generateCover } from "./generate-cover";
import { CoverConfig } from "./types";
import { getUsage, resetUsage } from "./gemini/client";

interface Args {
  configPath: string;
  outputDir: string;
}

function parseArgs(argv: string[]): Args {
  let configPath = "";
  let outputDir = path.resolve(process.cwd(), "public", "covers");
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" && argv[i + 1]) {
      configPath = argv[++i];
    } else if (arg === "--output" && argv[i + 1]) {
      outputDir = argv[++i];
    }
  }
  if (!configPath) {
    throw new Error("Missing required --config <path>");
  }
  return { configPath, outputDir };
}

async function main() {
  const args = parseArgs(process.argv);
  const raw = fs.readFileSync(args.configPath, "utf-8");
  const config: CoverConfig = JSON.parse(raw);
  resetUsage();
  const paths = await generateCover(config, args.outputDir);
  const geminiUsage = getUsage();
  process.stdout.write(
    JSON.stringify({ paths, geminiUsage }) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write(
    JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) + "\n",
  );
  process.exit(1);
});
