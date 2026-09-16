import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-md border border-border bg-surface px-4 text-base text-ink shadow-none outline-none transition-colors duration-150 placeholder:text-subtle focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
