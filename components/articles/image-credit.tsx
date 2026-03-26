import { cn } from "@/lib/utils";

interface ImageCreditProps {
  photographer?: string;
  photographerUrl?: string;
  source?: string;
  sourceUrl?: string;
  className?: string;
}

export function ImageCredit({
  photographer,
  photographerUrl,
  source,
  sourceUrl,
  className,
}: ImageCreditProps) {
  if (!photographer && !source) return null;

  return (
    <p className={cn("text-body-xs text-foreground-muted", className)}>
      Photo{" "}
      {photographer && (
        <>
          by{" "}
          {photographerUrl ? (
            <a
              href={photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors underline underline-offset-2"
            >
              {photographer}
            </a>
          ) : (
            photographer
          )}
        </>
      )}
      {photographer && source && " on "}
      {source && !photographer && "via "}
      {source &&
        (sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors underline underline-offset-2"
          >
            {source}
          </a>
        ) : (
          source
        ))}
    </p>
  );
}
