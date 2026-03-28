import { cn } from "@/lib/utils";

type Sentiment = "bullish" | "bearish" | "neutral";

interface SentimentBadgeProps {
  sentiment: Sentiment;
  className?: string;
}

const sentimentStyles: Record<Sentiment, string> = {
  bullish: "bg-positive/[0.12] text-positive",
  bearish: "bg-negative/[0.12] text-negative",
  neutral: "bg-info/[0.12] text-info",
};

const sentimentLabels: Record<Sentiment, string> = {
  bullish: "Bullish",
  bearish: "Bearish",
  neutral: "Neutral",
};

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-lg text-caption font-medium font-mono",
        sentimentStyles[sentiment],
        className
      )}
    >
      {sentimentLabels[sentiment]}
    </span>
  );
}
