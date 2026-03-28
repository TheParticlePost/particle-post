import { cn } from "@/lib/utils";

interface OverlineLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function OverlineLabel({ children, className }: OverlineLabelProps) {
  return (
    <span
      className={cn(
        "font-display text-overline font-bold uppercase text-accent",
        className
      )}
    >
      {children}
    </span>
  );
}
