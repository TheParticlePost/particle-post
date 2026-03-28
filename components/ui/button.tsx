import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "compact" | "default" | "hero";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-[#F5F0EB] font-semibold uppercase tracking-[0.05em] hover:bg-accent-hover",
  secondary:
    "border border-border-solid text-accent hover:border-accent bg-transparent",
  ghost:
    "text-text-body hover:text-text-primary bg-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  compact: "px-4 py-2 text-body-sm h-[38px] rounded-lg gap-1.5",
  default: "px-5 py-2.5 text-body-sm h-[44px] rounded-lg gap-2",
  hero: "px-7 py-3 text-body-md h-[52px] rounded-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-body text-body-sm font-semibold",
          "transition-colors duration-150 ease-kinetic",
          "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
