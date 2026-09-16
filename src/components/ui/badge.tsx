import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "primary" | "ink" | "warn";
}) {
  const tones = {
    muted: "bg-surface-2 text-muted",
    primary: "bg-primary/15 text-primary",
    ink: "bg-ink text-primary-fg",
    warn: "bg-danger/10 text-danger",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
