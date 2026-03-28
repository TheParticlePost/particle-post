import { cn } from "@/lib/utils";

interface DataTextProps {
  children: React.ReactNode;
  as?: "span" | "p" | "div" | "time";
  className?: string;
}

export function DataText({
  children,
  as: Tag = "span",
  className,
}: DataTextProps) {
  return (
    <Tag
      className={cn(
        "font-mono text-data tabular-nums text-text-secondary",
        className
      )}
    >
      {children}
    </Tag>
  );
}
