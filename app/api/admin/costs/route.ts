import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import { promises as fs } from "fs";
import path from "path";

const COSTS_DIR = path.join(process.cwd(), "pipeline", "logs", "costs");

/**
 * Estimate USD cost from token counts.
 * IMPORTANT: Keep in sync with pipeline/utils/cost_calculator.py
 */
function estimateCost(inputTokens: number, outputTokens: number): number {
  const SONNET_FRAC = 0.6;
  const HAIKU_FRAC = 0.4;
  return (
    (inputTokens * (3.0 / 1e6) + outputTokens * (15.0 / 1e6)) * SONNET_FRAC +
    (inputTokens * (0.25 / 1e6) + outputTokens * (1.25 / 1e6)) * HAIKU_FRAC
  );
}

interface CostEntry {
  date: string;
  slot: string;
  attempt: number;
  decision: string;
  total_input_tokens: number;
  total_output_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface DailyCost {
  date: string;
  runs: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let files: string[] = [];
    try {
      files = (await fs.readdir(COSTS_DIR))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse()
        .slice(0, 60); // Last 30 days × 2 runs/day
    } catch {
      // Directory doesn't exist yet
      return NextResponse.json({
        entries: [],
        daily: [],
        summary: { total_runs: 0, total_cost: 0, avg_cost_per_run: 0 },
      });
    }

    const entries: CostEntry[] = [];
    for (const file of files) {
      try {
        const raw = await fs.readFile(path.join(COSTS_DIR, file), "utf-8");
        entries.push(JSON.parse(raw));
      } catch {
        // Skip malformed files
      }
    }

    // Aggregate by day
    const dailyMap = new Map<string, DailyCost>();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const entry of entries) {
      const date = entry.date?.slice(0, 10) || "unknown";
      const input = entry.total_input_tokens || entry.prompt_tokens || 0;
      const output = entry.total_output_tokens || entry.completion_tokens || 0;

      totalInputTokens += input;
      totalOutputTokens += output;

      const existing = dailyMap.get(date) || {
        date,
        runs: 0,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost: 0,
      };
      existing.runs += 1;
      existing.input_tokens += input;
      existing.output_tokens += output;
      // Mirror: pipeline/utils/cost_calculator.py estimate_cost()
      // 60% Sonnet ($3/$15 per 1M), 40% Haiku ($0.25/$1.25 per 1M)
      existing.estimated_cost += estimateCost(input, output);
      dailyMap.set(date, existing);
    }

    const daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const totalCost = daily.reduce((sum, d) => sum + d.estimated_cost, 0);

    return NextResponse.json({
      entries: entries.slice(0, 20), // Recent raw entries
      daily,
      summary: {
        total_runs: entries.length,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_cost: Math.round(totalCost * 100) / 100,
        avg_cost_per_run:
          entries.length > 0
            ? Math.round((totalCost / entries.length) * 100) / 100
            : 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load cost data" },
      { status: 500 }
    );
  }
}
