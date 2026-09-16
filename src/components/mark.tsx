import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M24 10c4.5 6 7.5 10.5 7.5 15.2 0 4.3-3.2 7.8-7.5 7.8s-7.5-3.5-7.5-7.8C16.5 20.5 19.5 16 24 10Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M24 12c3.8 5.2 6.4 9.2 6.4 13.2 0 3.6-2.7 6.4-6.4 6.4s-6.4-2.8-6.4-6.4C17.6 21.2 20.2 17.2 24 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="24" cy="25.4" r="1.6" fill="currentColor" />
    </svg>
  );
}
