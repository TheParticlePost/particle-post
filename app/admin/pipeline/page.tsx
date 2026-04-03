import path from "path";
import fs from "fs/promises";
import { WidgetCard } from "@/components/admin/widget-card";
import { AgentCard } from "@/components/admin/widgets/agent-card";
import { AgentRunButton } from "@/components/admin/widgets/agent-run-button";
import { AgentRunDialog } from "@/components/admin/widgets/agent-run-dialog";
import { AgentLogs } from "@/components/admin/widgets/agent-logs";
import { PipelineConfigEditor } from "@/components/admin/widgets/pipeline-config-editor";
import { RejectionLog } from "@/components/admin/widgets/rejection-log";
import { WriterFeedback } from "@/components/admin/widgets/writer-feedback";
import { ApiCosts } from "@/components/admin/widgets/api-costs";
import { HumanPostDialog } from "@/components/admin/widgets/human-post-dialog";

// --- SVG icons for agents ---
const PenIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const MoonIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const MegaphoneIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const ShieldIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ClipboardIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const PaletteIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" />
    <circle cx="14" cy="15" r="1.5" fill="currentColor" />
  </svg>
);

// --- Data loaders ---

interface PostIndexEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
}

interface FeedbackEntry {
  text: string;
  slot: string;
  date: string;
}

interface RejectionEntry {
  date: string;
  slug: string;
  reason: string;
}

interface AgentInfo {
  name: string;
  schedule: string;
  lastActivity: string | null;
  icon: React.ReactNode;
  workflow: string;
}

interface CostLogEntry {
  timestamp: string;
  slot: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  successful_requests: number;
  verdict: string;
}

async function getLatestPostDate(): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), "pipeline/config/post_index.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    const posts: PostIndexEntry[] = data.posts ?? [];
    if (posts.length === 0) return null;

    const sorted = [...posts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0].date;
  } catch {
    return null;
  }
}

async function getWriterFeedback(): Promise<FeedbackEntry[]> {
  try {
    const filePath = path.join(process.cwd(), "pipeline/data/writer_feedback.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return (data.notes ?? []) as FeedbackEntry[];
  } catch {
    return [];
  }
}

async function getRejections(): Promise<RejectionEntry[]> {
  try {
    const dir = path.join(process.cwd(), "pipeline/logs/rejections");
    const entries = await fs.readdir(dir);
    const jsonFiles = entries
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 10);

    const results: RejectionEntry[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        const data = JSON.parse(raw);
        // Support both single rejection and array formats
        if (Array.isArray(data)) {
          for (const entry of data) {
            results.push({
              date: entry.date ?? file.replace(".json", ""),
              slug: entry.slug ?? entry.title ?? "Unknown",
              reason: entry.reason ?? entry.message ?? "No reason provided",
            });
          }
        } else {
          results.push({
            date: data.date ?? file.replace(".json", ""),
            slug: data.slug ?? data.title ?? "Unknown",
            reason: data.reason ?? data.message ?? "No reason provided",
          });
        }
      } catch {
        // Skip malformed files
      }
    }
    return results.slice(0, 10);
  } catch {
    // Directory may not exist
    return [];
  }
}

async function getLatestMarketingDate(): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "pipeline/logs/marketing");
    const entries = await fs.readdir(dir);
    const mdFiles = entries.filter((f) => f.endsWith(".md")).sort().reverse();
    if (mdFiles.length === 0) return null;
    // Extract date from filename (e.g., 2026-03-24.md)
    return mdFiles[0].replace(".md", "");
  } catch {
    return null;
  }
}

async function getLatestSecurityDate(): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), "pipeline/logs/security");
    const entries = await fs.readdir(dir);
    const jsonFiles = entries.filter((f) => f.endsWith(".json")).sort().reverse();
    if (jsonFiles.length === 0) return null;
    return jsonFiles[0].replace(".json", "");
  } catch {
    return null;
  }
}

async function getLatestFeedbackDate(
  feedback: FeedbackEntry[]
): Promise<string | null> {
  if (feedback.length === 0) return null;
  const last = feedback[feedback.length - 1];
  return last.date ? last.date.split("T")[0] : null;
}

async function getCostLogs(): Promise<CostLogEntry[]> {
  try {
    const dir = path.join(process.cwd(), "pipeline/logs/costs");
    const entries = await fs.readdir(dir);
    const jsonFiles = entries
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 30);

    const results: CostLogEntry[] = [];
    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        results.push(JSON.parse(raw));
      } catch {
        // Skip malformed files
      }
    }
    return results;
  } catch {
    return [];
  }
}

export default async function PipelinePage() {
  const [
    latestPostDate,
    writerFeedback,
    rejections,
    latestMarketingDate,
    latestSecurityDate,
  ] = await Promise.all([
    getLatestPostDate(),
    getWriterFeedback(),
    getRejections(),
    getLatestMarketingDate(),
    getLatestSecurityDate(),
  ]);

  const latestFeedbackDate = await getLatestFeedbackDate(writerFeedback);

  const costLogs = await getCostLogs();

  // Build agent info
  const agents: AgentInfo[] = [
    {
      name: "Morning Post",
      schedule: "Daily at 8:00 AM UTC",
      lastActivity: latestPostDate,
      icon: PenIcon,
      workflow: "morning-post.yml",
    },
    {
      name: "Evening Post",
      schedule: "Daily at 6:00 PM UTC",
      lastActivity: latestPostDate,
      icon: MoonIcon,
      workflow: "evening-post.yml",
    },
    {
      name: "Marketing Director",
      schedule: "Daily report generation",
      lastActivity: latestMarketingDate,
      icon: MegaphoneIcon,
      workflow: "marketing-director.yml",
    },
    {
      name: "Security Audit",
      schedule: "Weekly security scan",
      lastActivity: latestSecurityDate,
      icon: ShieldIcon,
      workflow: "security-audit.yml",
    },
    {
      name: "Content Audit",
      schedule: "Weekly content quality review",
      lastActivity: latestFeedbackDate,
      icon: ClipboardIcon,
      workflow: "content-audit.yml",
    },
    {
      name: "UI Designer",
      schedule: "On-demand design iterations",
      lastActivity: null,
      icon: PaletteIcon,
      workflow: "ui-designer.yml",
    },
  ];

  // Get last 5 feedback entries (most recent first)
  const recentFeedback = [...writerFeedback].reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-lg text-text-primary">
            Agent Monitor
          </h1>
          <p className="text-body-sm text-text-muted mt-1">
            Pipeline agent status, editorial feedback, and rejection logs.
          </p>
        </div>
        <HumanPostDialog />
      </div>

      {/* Agent status grid */}
      <WidgetCard title="Agent Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              name={agent.name}
              schedule={agent.schedule}
              lastActivity={agent.lastActivity}
              icon={agent.icon}
            >
              <div className="flex items-center gap-2">
                <AgentRunDialog workflow={agent.workflow} label={agent.name} />
                <AgentRunButton workflow={agent.workflow} />
              </div>
            </AgentCard>
          ))}
        </div>
      </WidgetCard>

      {/* Workflow Execution Logs */}
      <WidgetCard title="Recent Pipeline Runs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.slice(0, 4).map((agent) => (
            <div key={agent.workflow} className="bg-bg-low rounded-lg p-4">
              <p className="text-body-sm text-text-primary font-medium mb-3">{agent.name}</p>
              <AgentLogs workflow={agent.workflow} />
            </div>
          ))}
        </div>
      </WidgetCard>

      {/* Pipeline Configuration */}
      <WidgetCard title="Pipeline Configuration">
        <PipelineConfigEditor />
      </WidgetCard>

      {/* API Cost Tracking */}
      <WidgetCard title="API Costs">
        <ApiCosts logs={costLogs} />
      </WidgetCard>

      {/* Two column grid for feedback and rejections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WidgetCard title="Writer Feedback">
          <WriterFeedback entries={recentFeedback} />
        </WidgetCard>

        <WidgetCard title="Rejection Log">
          <RejectionLog rejections={rejections} />
        </WidgetCard>
      </div>
    </div>
  );
}
