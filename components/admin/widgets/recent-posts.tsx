import Link from "next/link";
import { cn, formatDateShort } from "@/lib/utils";

interface PostItem {
  title: string;
  slug: string;
  date: string;
  funnel_type: string;
}

interface RecentPostsProps {
  posts: PostItem[];
}

const FUNNEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  TOF: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", label: "TOF" },
  MOF: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", label: "MOF" },
  BOF: { bg: "rgba(0, 212, 170, 0.12)", text: "#E8552E", label: "BOF" },
};

function FunnelBadge({ type }: { type: string }) {
  const config = FUNNEL_COLORS[type] ?? {
    bg: "rgba(156, 163, 175, 0.12)",
    text: "#9ca3af",
    label: type,
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-body-xs font-medium shrink-0"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

export function RecentPosts({ posts }: RecentPostsProps) {
  if (posts.length === 0) {
    return (
      <p className="text-body-sm text-text-muted py-4">
        No posts published yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-ghost">
      {posts.slice(0, 5).map((post) => (
        <li key={post.slug} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/posts/${post.slug}/`}
                className={cn(
                  "text-body-sm font-medium text-text-primary",
                  "hover:text-accent transition-colors duration-200",
                  "line-clamp-2"
                )}
              >
                {post.title}
              </Link>
              <p className="text-body-xs text-text-muted mt-0.5">
                {formatDateShort(post.date)}
              </p>
            </div>
            <FunnelBadge type={post.funnel_type} />
          </div>
        </li>
      ))}
    </ul>
  );
}
