import { cn, formatDateShort } from "@/lib/utils";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribed_at: string;
}

interface SubscriberListProps {
  subscribers: Subscriber[];
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-body-xs font-medium",
        isActive
          ? "bg-accent/12 text-accent"
          : "bg-[rgba(239,68,68,0.12)] text-[#ef4444]"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isActive ? "bg-accent" : "bg-[#ef4444]"
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function SubscriberList({ subscribers }: SubscriberListProps) {
  if (subscribers.length === 0) {
    return (
      <p className="text-body-sm text-foreground-muted py-4">
        No subscribers found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="pb-3 pr-4 text-left font-medium text-foreground-muted">
              Email
            </th>
            <th className="pb-3 pr-4 text-center font-medium text-foreground-muted">
              Status
            </th>
            <th className="pb-3 text-left font-medium text-foreground-muted hidden sm:table-cell">
              Subscribed
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {subscribers.map((sub) => (
            <tr
              key={sub.id}
              className="hover:bg-[var(--bg-secondary)] transition-colors duration-150"
            >
              <td className="py-3 pr-4 text-foreground truncate max-w-[240px]">
                {sub.email}
              </td>
              <td className="py-3 pr-4 text-center">
                <StatusBadge status={sub.status} />
              </td>
              <td className="py-3 text-foreground-muted whitespace-nowrap hidden sm:table-cell">
                {formatDateShort(sub.subscribed_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
