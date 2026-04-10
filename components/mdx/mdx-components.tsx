import { StatBox } from "@/components/mdx/stat-box";
import { BarChart } from "@/components/mdx/bar-chart";
import { TimeSeriesChart } from "@/components/mdx/time-series-chart";
import { ComparisonTable } from "@/components/mdx/comparison-table";
import { ProcessFlow } from "@/components/mdx/process-flow";
import { BeforeAfter } from "@/components/mdx/before-after";
import { TimelineViz } from "@/components/mdx/timeline-viz";
import { VerdictCard } from "@/components/mdx/verdict-card";
import { PersonaCallout } from "@/components/mdx/persona-callout";

export const mdxComponents = {
  StatBox,
  BarChart,
  TimeSeriesChart,
  ComparisonTable,
  ProcessFlow,
  BeforeAfter,
  TimelineViz,
  // Hugo shortcode {{< verdict >}} converts to <Verdict />, so alias both names
  Verdict: VerdictCard,
  VerdictCard,
  // Hugo shortcode {{< persona-note >}} converts to <PersonaNote />, so alias both names
  PersonaNote: PersonaCallout,
  PersonaCallout,
};
