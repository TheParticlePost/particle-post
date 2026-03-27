import { cn, formatDateShort } from "@/lib/utils";

interface RejectionEntry {
  date: string;
  slug: string;
  reason: string;
}

interface RejectionLogProps {
  rejections: RejectionEntry[];
}

export function RejectionLog({ rejections }: RejectionLogProps) {
  if (rejections.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
        <p className="text-body-sm text-foreground-muted">
          No rejections recorded. Pipeline is running clean.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {rejections.map((entry, i) => (
        <li key={`${entry.date}-${i}`} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-warning mt-1.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm font-medium text-foreground">
                  {entry.slug}
                </span>
                <span className="text-body-xs text-foreground-muted">
                  {formatDateShort(entry.date)}
                </span>
              </div>
              <p className="text-body-xs text-foreground-muted mt-0.5 line-clamp-2">
                {entry.reason}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
