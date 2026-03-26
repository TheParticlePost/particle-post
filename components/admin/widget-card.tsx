import Link from "next/link";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  action?: { label: string; href: string };
  className?: string;
  children: React.ReactNode;
}

export function WidgetCard({
  title,
  action,
  className,
  children,
}: WidgetCardProps) {
  return (
    <div className={cn("glass-card p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-display-sm text-foreground">
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className={cn(
              "text-body-xs font-medium text-accent hover:text-accent-hover",
              "transition-colors duration-200"
            )}
          >
            {action.label} &rarr;
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
