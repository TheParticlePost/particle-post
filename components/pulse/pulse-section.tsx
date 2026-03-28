import { FadeUp } from "@/components/effects/fade-up";
import { OverlineLabel } from "@/components/ui/overline-label";
import { cn } from "@/lib/utils";

interface PulseSectionProps {
  overline: string;
  title: string;
  bg?: "base" | "low" | "container";
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const bgMap = {
  base: "bg-bg-base",
  low: "bg-bg-low",
  container: "bg-bg-container",
};

export function PulseSection({
  overline,
  title,
  bg = "base",
  children,
  className,
  delay = 0,
}: PulseSectionProps) {
  return (
    <section className={cn("py-16 sm:py-20 px-4 sm:px-6", bgMap[bg], className)}>
      <div className="max-w-[1200px] mx-auto">
        <FadeUp delay={delay}>
          <OverlineLabel className="mb-4 block">{overline}</OverlineLabel>
          <h2 className="font-display text-display-lg text-text-primary mb-10">
            {title}
          </h2>
        </FadeUp>
        <FadeUp delay={delay + 0.05}>
          {children}
        </FadeUp>
      </div>
    </section>
  );
}
