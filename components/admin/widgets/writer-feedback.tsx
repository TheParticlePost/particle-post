import { cn, formatDateShort } from "@/lib/utils";

interface FeedbackEntry {
  text: string;
  slot: string;
  date: string;
}

interface WriterFeedbackProps {
  entries: FeedbackEntry[];
}

const SLOT_COLORS: Record<string, { bg: string; text: string }> = {
  morning: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6" },
  evening: { bg: "rgba(139, 92, 246, 0.12)", text: "#8b5cf6" },
  audit: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b" },
};

export function WriterFeedback({ entries }: WriterFeedbackProps) {
  if (entries.length === 0) {
    return (
      <p className="text-body-sm text-foreground-muted py-4">
        No editorial feedback recorded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {entries.map((entry, i) => {
        const slotConfig = SLOT_COLORS[entry.slot] ?? {
          bg: "rgba(156, 163, 175, 0.12)",
          text: "#9ca3af",
        };

        return (
          <li key={`${entry.date}-${i}`} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-body-xs font-medium capitalize"
                style={{ backgroundColor: slotConfig.bg, color: slotConfig.text }}
              >
                {entry.slot}
              </span>
              <span className="text-body-xs text-foreground-muted">
                {formatDateShort(entry.date)}
              </span>
            </div>
            <p className="text-body-sm text-foreground-secondary leading-relaxed line-clamp-3">
              {entry.text}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
