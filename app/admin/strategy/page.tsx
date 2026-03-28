import path from "path";
import fs from "fs/promises";
import { WidgetCard } from "@/components/admin/widget-card";
import { StrategyViewer } from "@/components/admin/widgets/strategy-viewer";
import { MarketingLog } from "@/components/admin/widgets/marketing-log";
import { cn } from "@/lib/utils";

interface ScheduleSlot {
  funnel: string;
  content_type: string;
}

interface DaySchedule {
  morning: ScheduleSlot;
  evening: ScheduleSlot;
}

interface ContentStrategy {
  schedule?: Record<string, DaySchedule>;
  funnel_types?: Record<
    string,
    { name: string; word_count?: { min: number; max: number; target: number } }
  >;
  theme_weights?: Record<
    string,
    { weight: number; pillars: string[]; audience: string }
  >;
  ai_tells_to_avoid?: string[];
  content_types?: Record<string, { name: string; target_share: number }>;
  [key: string]: unknown;
}

interface DecisionEntry {
  date: string;
  decision: string;
  rationale: string;
  plan_summary: string;
}

interface MarketingStrategy {
  current_plan?: {
    type: string;
    started: string;
    description: string;
    evaluation_date: string;
    content_pillar_focus?: string;
    target_keywords?: string[];
    long_tail_keywords?: string[];
  };
  decision_history?: DecisionEntry[];
  [key: string]: unknown;
}

interface SeoConfig {
  keyword_targets?: string[];
  content_gap_priorities?: string[];
  schema_priority?: string;
  schema_coverage?: Record<string, number>;
  avoid_cannibalization?: string[];
  [key: string]: unknown;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getMarketingLogs(): Promise<
  { date: string; content: string }[]
> {
  const dir = path.join(process.cwd(), "pipeline/logs/marketing");
  try {
    const files = await fs.readdir(dir);
    const mdFiles = files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 3);

    const logs = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(dir, file), "utf-8");
          const date = file.replace(".md", "");
          return { date, content };
        } catch {
          return null;
        }
      })
    );

    return logs.filter(Boolean) as { date: string; content: string }[];
  } catch {
    return [];
  }
}

const FUNNEL_COLORS: Record<string, string> = {
  TOF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MOF: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  BOF: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const DECISION_COLORS: Record<string, string> = {
  KEEP: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ADJUST: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  NEW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default async function StrategyPage() {
  const configDir = path.join(process.cwd(), "pipeline/config");

  const [contentStrategy, marketingStrategy, seoConfig, marketingLogs] =
    await Promise.all([
      readJson<ContentStrategy>(path.join(configDir, "content_strategy.json")),
      readJson<MarketingStrategy>(
        path.join(configDir, "marketing_strategy.json")
      ),
      readJson<SeoConfig>(path.join(configDir, "seo_gso_config.json")),
      getMarketingLogs(),
    ]);

  // Build schedule display data
  const schedule = contentStrategy?.schedule;
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Get last 3 unique decisions from history
  const decisionHistory = marketingStrategy?.decision_history ?? [];
  const recentDecisions = decisionHistory.slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Content &amp; Marketing Strategy
        </h1>
        <p className="text-body-sm text-text-muted mt-1">
          Funnel definitions, marketing plans, SEO targets, and daily reports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Content Strategy */}
        <WidgetCard title="Content Strategy" className="lg:col-span-2">
          {contentStrategy ? (
            <div className="space-y-6">
              {/* Funnel Schedule */}
              <div>
                <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-3">
                  Weekly Funnel Schedule
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border-ghost">
                  <table className="w-full text-body-xs">
                    <thead>
                      <tr className="bg-bg-high">
                        <th className="px-3 py-2 text-left text-text-muted font-medium uppercase tracking-wider">
                          Day
                        </th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium uppercase tracking-wider">
                          Morning
                        </th>
                        <th className="px-3 py-2 text-left text-text-muted font-medium uppercase tracking-wider">
                          Evening
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => {
                        const daySchedule = schedule?.[day];
                        return (
                          <tr
                            key={day}
                            className="border-t border-border-ghost hover:bg-bg-low"
                          >
                            <td className="px-3 py-2 text-text-primary font-medium">
                              {day}
                            </td>
                            <td className="px-3 py-2">
                              {daySchedule?.morning ? (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-block px-2 py-0.5 rounded-md text-body-xs border",
                                      FUNNEL_COLORS[
                                        daySchedule.morning.funnel
                                      ] ?? "bg-bg-high text-text-primary"
                                    )}
                                  >
                                    {daySchedule.morning.funnel}
                                  </span>
                                  <span className="text-text-muted">
                                    {daySchedule.morning.content_type}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-text-muted">
                                  --
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {daySchedule?.evening ? (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-block px-2 py-0.5 rounded-md text-body-xs border",
                                      FUNNEL_COLORS[
                                        daySchedule.evening.funnel
                                      ] ?? "bg-bg-high text-text-primary"
                                    )}
                                  >
                                    {daySchedule.evening.funnel}
                                  </span>
                                  <span className="text-text-muted">
                                    {daySchedule.evening.content_type}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-text-muted">
                                  --
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Word Count Targets */}
              {contentStrategy.funnel_types && (
                <div>
                  <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-3">
                    Word Count Targets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(contentStrategy.funnel_types).map(
                      ([key, funnel]) => (
                        <div
                          key={key}
                          className={cn(
                            "rounded-lg px-4 py-3",
                            "bg-bg-low border border-border-ghost"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-md text-body-xs border mb-2",
                              FUNNEL_COLORS[key] ??
                                "bg-bg-high text-text-primary"
                            )}
                          >
                            {key}
                          </span>
                          <p className="text-body-xs text-text-muted truncate">
                            {funnel.name}
                          </p>
                          {funnel.word_count && (
                            <p className="text-body-sm text-text-primary font-mono mt-1">
                              {funnel.word_count.min.toLocaleString()}&ndash;
                              {funnel.word_count.max.toLocaleString()}{" "}
                              <span className="text-text-muted">
                                (target: {funnel.word_count.target.toLocaleString()})
                              </span>
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Theme Weights */}
              {contentStrategy.theme_weights && (
                <div>
                  <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-3">
                    Theme Weights
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(contentStrategy.theme_weights).map(
                      ([key, theme]) => (
                        <div
                          key={key}
                          className={cn(
                            "rounded-lg px-4 py-3",
                            "bg-bg-low border border-border-ghost"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-body-sm text-text-primary font-medium capitalize">
                              {key}
                            </p>
                            <p className="text-display-sm font-display text-accent">
                              {Math.round(theme.weight * 100)}%
                            </p>
                          </div>
                          <div className="w-full bg-[var(--bg-primary)] rounded-full h-2 mb-2">
                            <div
                              className="bg-accent rounded-full h-2 transition-all"
                              style={{ width: `${theme.weight * 100}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {theme.pillars.map((pillar) => (
                              <span
                                key={pillar}
                                className="text-body-xs px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20"
                              >
                                {pillar}
                              </span>
                            ))}
                          </div>
                          <p className="text-body-xs text-text-muted mt-2">
                            {theme.audience}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted text-body-sm">
              No content strategy data available yet.
            </p>
          )}
        </WidgetCard>

        {/* Card 2: Marketing Strategy */}
        <WidgetCard title="Marketing Strategy">
          {marketingStrategy ? (
            <div className="space-y-4">
              {/* Current Plan */}
              {marketingStrategy.current_plan && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-body-xs border font-medium",
                        DECISION_COLORS[
                          marketingStrategy.current_plan.type
                        ] ?? "bg-bg-high text-text-primary"
                      )}
                    >
                      {marketingStrategy.current_plan.type}
                    </span>
                    <span className="text-body-xs text-text-muted">
                      since {marketingStrategy.current_plan.started}
                    </span>
                  </div>
                  <p className="text-body-sm text-text-primary leading-relaxed">
                    {marketingStrategy.current_plan.description}
                  </p>
                  {marketingStrategy.current_plan.content_pillar_focus && (
                    <p className="text-body-xs text-text-muted mt-2">
                      Pillar:{" "}
                      <span className="text-accent">
                        {marketingStrategy.current_plan.content_pillar_focus}
                      </span>
                    </p>
                  )}
                  {marketingStrategy.current_plan.evaluation_date && (
                    <p className="text-body-xs text-text-muted mt-1">
                      Next evaluation:{" "}
                      <span className="text-text-primary">
                        {marketingStrategy.current_plan.evaluation_date}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Recent Decisions */}
              {recentDecisions.length > 0 && (
                <div>
                  <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-2 mt-4">
                    Recent Decisions
                  </h3>
                  <div className="space-y-2">
                    {recentDecisions.map((entry, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg p-3",
                          "bg-bg-low border border-border-ghost"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-md text-body-xs border font-medium",
                              DECISION_COLORS[entry.decision] ??
                                "bg-bg-high text-text-primary"
                            )}
                          >
                            {entry.decision}
                          </span>
                          <span className="text-body-xs text-text-muted">
                            {entry.date}
                          </span>
                        </div>
                        <p className="text-body-xs text-text-secondary leading-relaxed line-clamp-3">
                          {entry.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted text-body-sm">
              No marketing strategy data available yet.
            </p>
          )}
        </WidgetCard>

        {/* Card 3: SEO Config */}
        <WidgetCard title="SEO Config">
          {seoConfig ? (
            <div className="space-y-4">
              {/* Keyword Targets */}
              {seoConfig.keyword_targets &&
                seoConfig.keyword_targets.length > 0 && (
                  <div>
                    <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-2">
                      Keyword Targets
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {seoConfig.keyword_targets.map((kw) => (
                        <span
                          key={kw}
                          className="inline-block px-2 py-0.5 rounded-md text-body-xs bg-accent/10 text-accent border border-accent/20"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Content Gaps */}
              {seoConfig.content_gap_priorities &&
                seoConfig.content_gap_priorities.length > 0 && (
                  <div>
                    <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-2">
                      Content Gap Priorities
                    </h3>
                    <div className="space-y-2">
                      {seoConfig.content_gap_priorities.map((gap, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg p-3",
                            "bg-bg-low border border-border-ghost"
                          )}
                        >
                          <p className="text-body-xs text-text-secondary leading-relaxed">
                            {gap}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Schema Coverage */}
              {seoConfig.schema_coverage && (
                <div>
                  <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-2">
                    Schema Coverage
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(seoConfig.schema_coverage).map(
                      ([schema, count]) => (
                        <div
                          key={schema}
                          className={cn(
                            "rounded-lg px-3 py-2",
                            "bg-bg-low border border-border-ghost"
                          )}
                        >
                          <p className="text-body-xs text-text-muted">
                            {schema}
                          </p>
                          <p
                            className={cn(
                              "text-body-md font-display",
                              count > 0 ? "text-accent" : "text-text-muted"
                            )}
                          >
                            {count}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                  {seoConfig.schema_priority && (
                    <p className="text-body-xs text-text-muted mt-2">
                      Priority:{" "}
                      <span className="text-accent">
                        {seoConfig.schema_priority}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-muted text-body-sm">
              No SEO config data available yet.
            </p>
          )}
        </WidgetCard>

        {/* Card 4: Marketing Reports */}
        <WidgetCard title="Marketing Reports" className="lg:col-span-2">
          <MarketingLog logs={marketingLogs} />
        </WidgetCard>
      </div>
    </div>
  );
}
