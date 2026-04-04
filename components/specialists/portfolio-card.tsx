import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PortfolioItem } from "@/lib/specialists/types";

interface PortfolioCardProps {
  item: PortfolioItem;
  className?: string;
}

export function PortfolioCard({ item, className }: PortfolioCardProps) {
  const Wrapper = item.external_url ? "a" : "div";
  const wrapperProps = item.external_url
    ? { href: item.external_url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "block bg-bg-container border border-border-ghost rounded-lg overflow-hidden",
        "transition-colors duration-[180ms] ease-kinetic",
        item.external_url && "hover:border-border-hover cursor-pointer",
        className
      )}
    >
      {item.image_url && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <h4 className="font-display font-bold text-body-md text-text-primary">
          {item.title}
        </h4>
        {item.description && (
          <p className="text-body-sm text-text-secondary line-clamp-3">
            {item.description}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
