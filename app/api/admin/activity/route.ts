import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifyAdmin } from "@/lib/api-auth";

type EventType = "POST" | "REJECTION" | "AGENT" | "FEEDBACK" | "REPORT" | "COST";

interface ActivityEvent {
  type: EventType;
  message: string;
  timestamp: string;
  icon: "green" | "red" | "blue" | "amber" | "gray";
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "30", 10) || 30, 1), 100);

  const events: ActivityEvent[] = [];

  // 1. Published posts from post_index.json
  try {
    const indexPath = path.join(process.cwd(), "pipeline/config/post_index.json");
    const raw = await fs.readFile(indexPath, "utf-8");
    const { posts } = JSON.parse(raw) as {
      posts: { slug: string; title: string; date: string }[];
    };

    for (const p of posts) {
      events.push({
        type: "POST",
        message: `Published: ${p.title}`,
        timestamp: p.date + "T12:00:00Z",
        icon: "green",
      });
    }
  } catch {
    // post_index missing — skip
  }

  // 2. Rejections from pipeline/logs/rejections/*.json
  try {
    const rejectDir = path.join(process.cwd(), "pipeline/logs/rejections");
    const files = await fs.readdir(rejectDir);

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(rejectDir, file), "utf-8");
        const data = JSON.parse(raw);
        const reason = data.reason ?? data.message ?? "Unknown reason";
        const timestamp = data.timestamp ?? data.date ?? file.replace(".json", "") + "T12:00:00Z";

        events.push({
          type: "REJECTION",
          message: `Rejected: ${reason}`,
          timestamp: typeof timestamp === "string" ? timestamp : new Date().toISOString(),
          icon: "red",
        });
      } catch {
        // Malformed file — skip
      }
    }
  } catch {
    // No rejections directory — skip
  }

  // 3. Writer feedback from pipeline/data/writer_feedback.json
  try {
    const fbPath = path.join(process.cwd(), "pipeline/data/writer_feedback.json");
    const raw = await fs.readFile(fbPath, "utf-8");
    const { notes } = JSON.parse(raw) as {
      notes: { text: string; slot: string; date: string }[];
    };

    for (const note of notes) {
      // Truncate to first 80 chars for readability
      const preview = note.text.length > 80 ? note.text.slice(0, 77) + "..." : note.text;
      events.push({
        type: "FEEDBACK",
        message: `Editor note: ${preview}`,
        timestamp: note.date,
        icon: "amber",
      });
    }
  } catch {
    // No feedback file — skip
  }

  // 4. Marketing reports from pipeline/logs/marketing/*.md (filename = date)
  try {
    const marketDir = path.join(process.cwd(), "pipeline/logs/marketing");
    const files = await fs.readdir(marketDir);

    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const datePart = file.replace(".md", "");
      events.push({
        type: "REPORT",
        message: "Daily marketing report generated",
        timestamp: datePart + "T18:00:00Z",
        icon: "blue",
      });
    }
  } catch {
    // No marketing logs — skip
  }

  // 5. Pipeline cost logs from pipeline/logs/costs/*.json
  try {
    const costsDir = path.join(process.cwd(), "pipeline/logs/costs");
    const files = await fs.readdir(costsDir);

    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(costsDir, file), "utf-8");
        const data = JSON.parse(raw) as {
          timestamp?: string;
          slot?: string;
          total_tokens?: number;
          estimated_cost_usd?: number;
        };

        const cost = data.estimated_cost_usd?.toFixed(2) ?? "?";
        const tokens =
          data.total_tokens != null
            ? `${(data.total_tokens / 1000).toFixed(1)}K tokens`
            : "";
        const slot = data.slot ?? "unknown";
        const tokenSuffix = tokens ? `, ${tokens}` : "";

        events.push({
          type: "COST",
          message: `Pipeline run: $${cost} (${slot}${tokenSuffix})`,
          timestamp: data.timestamp ?? file.replace(".json", "").slice(0, 10) + "T12:00:00Z",
          icon: "gray",
        });
      } catch {
        // Malformed cost file — skip
      }
    }
  } catch {
    // No costs directory — skip
  }

  // Sort descending by timestamp and limit
  events.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return tb - ta;
  });

  return NextResponse.json({ events: events.slice(0, limit) });
}
