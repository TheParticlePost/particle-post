import path from "path";
import fs from "fs/promises";
import { WidgetCard } from "@/components/admin/widget-card";
import { SecuritySummary } from "@/components/admin/widgets/security-summary";
import { SecurityFindings } from "@/components/admin/widgets/security-findings";
import { cn } from "@/lib/utils";

interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Finding {
  severity: string;
  category: string;
  title: string;
  detail: string;
  file_path?: string;
  auto_fixable?: boolean;
  fixed?: boolean;
}

interface SecurityScan {
  date: string;
  scan_duration_seconds?: number;
  summary: SeverityCounts;
  findings: Finding[];
  scans_completed?: string[];
}

async function getSecurityScans(): Promise<SecurityScan[]> {
  const dir = path.join(process.cwd(), "pipeline/logs/security");
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    const scans = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const raw = await fs.readFile(path.join(dir, file), "utf-8");
          const data = JSON.parse(raw) as SecurityScan;
          // Ensure date is set from filename if missing
          if (!data.date) {
            data.date = file.replace(".json", "");
          }
          return data;
        } catch {
          return null;
        }
      })
    );

    return scans.filter(Boolean) as SecurityScan[];
  } catch {
    return [];
  }
}

function formatScanDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function SecurityPage() {
  const scans = await getSecurityScans();

  const latestScan = scans[0] ?? null;
  const recentScans = scans.slice(0, 3);

  // Merge findings from latest scan for the findings card
  const findings = latestScan?.findings ?? [];

  // Default summary if no scans
  const summary: SeverityCounts = latestScan?.summary ?? {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-lg text-foreground">
          Security Overview
        </h1>
        <p className="text-body-sm text-foreground-muted mt-1">
          Automated security scan results and vulnerability tracking.
        </p>
      </div>

      {scans.length === 0 ? (
        <WidgetCard title="Security Scans">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-foreground-muted"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-foreground-muted text-body-sm">
              No security scans found yet.
            </p>
            <p className="text-foreground-muted text-body-xs mt-1">
              Security scan results will appear in{" "}
              <code className="text-accent font-mono">
                pipeline/logs/security/
              </code>{" "}
              after the first scan runs.
            </p>
          </div>
        </WidgetCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Severity Overview */}
          <WidgetCard title="Severity Overview" className="lg:col-span-2">
            <SecuritySummary summary={summary} />
            {latestScan && (
              <p className="text-body-xs text-foreground-muted text-center mt-2">
                Last scan: {formatScanDate(latestScan.date)}
                {latestScan.scan_duration_seconds != null && (
                  <span>
                    {" "}
                    ({latestScan.scan_duration_seconds.toFixed(1)}s)
                  </span>
                )}
              </p>
            )}
          </WidgetCard>

          {/* Card 2: Findings */}
          <WidgetCard title="Findings" className="lg:col-span-2">
            <SecurityFindings findings={findings} />
          </WidgetCard>

          {/* Card 3: Scan History */}
          <WidgetCard title="Scan History" className="lg:col-span-2">
            {recentScans.length > 0 ? (
              <div className="space-y-2">
                {recentScans.map((scan) => {
                  const total =
                    scan.summary.critical +
                    scan.summary.high +
                    scan.summary.medium +
                    scan.summary.low;

                  return (
                    <div
                      key={scan.date}
                      className={cn(
                        "rounded-lg p-4",
                        "bg-[var(--bg-secondary)] border border-[var(--border)]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              scan.summary.critical > 0
                                ? "bg-red-500/20"
                                : scan.summary.high > 0
                                  ? "bg-orange-500/20"
                                  : "bg-emerald-500/20"
                            )}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={cn(
                                scan.summary.critical > 0
                                  ? "text-red-400"
                                  : scan.summary.high > 0
                                    ? "text-orange-400"
                                    : "text-emerald-400"
                              )}
                            >
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-body-sm text-foreground font-medium">
                              {formatScanDate(scan.date)}
                            </p>
                            <p className="text-body-xs text-foreground-muted">
                              {total} finding{total !== 1 ? "s" : ""}
                              {scan.scan_duration_seconds != null && (
                                <span>
                                  {" "}
                                  &middot;{" "}
                                  {scan.scan_duration_seconds.toFixed(1)}s
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Severity badges */}
                        <div className="flex items-center gap-2">
                          {scan.summary.critical > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-body-xs bg-red-500/20 text-red-400 border border-red-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              {scan.summary.critical}
                            </span>
                          )}
                          {scan.summary.high > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-body-xs bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              {scan.summary.high}
                            </span>
                          )}
                          {scan.summary.medium > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-body-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                              {scan.summary.medium}
                            </span>
                          )}
                          {scan.summary.low > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-body-xs text-foreground-muted border border-[var(--border)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                              {scan.summary.low}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-foreground-muted text-body-sm">
                No scan history available.
              </p>
            )}
          </WidgetCard>
        </div>
      )}
    </div>
  );
}
