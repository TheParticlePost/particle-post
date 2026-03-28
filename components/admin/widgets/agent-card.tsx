import { cn, formatDateShort } from "@/lib/utils";

interface AgentCardProps {
  name: string;
  schedule: string;
  lastActivity: string | null;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

export function AgentCard({ name, schedule, lastActivity, icon, children }: AgentCardProps) {
  const isRecent =
    lastActivity &&
    new Date(lastActivity).getTime() > Date.now() - 48 * 60 * 60 * 1000;

  return (
    <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] p-4 flex items-start gap-3">
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          isRecent ? "bg-accent/12 text-accent" : "bg-[var(--bg-tertiary)] text-foreground-muted"
        )}
      >
        {icon}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-body-sm font-medium text-foreground truncate">
            {name}
          </h3>
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              isRecent ? "bg-accent" : "bg-foreground-muted/40"
            )}
          />
          {children && <div className="ml-auto shrink-0">{children}</div>}
        </div>
        <p className="text-body-xs text-foreground-muted mt-0.5">{schedule}</p>
        <p className="text-body-xs text-foreground-muted mt-1">
          Last active:{" "}
          <span className={isRecent ? "text-accent" : "text-foreground-muted"}>
            {lastActivity ? formatDateShort(lastActivity) : "Never"}
          </span>
        </p>
      </div>
    </div>
  );
}
