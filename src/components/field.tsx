import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
