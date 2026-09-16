import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { STUDIO } from "@/lib/intake-schema";
import { BrandMark } from "@/components/mark";
import { cn } from "@/lib/utils";

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-24 animate-pulse rounded-full bg-surface-2" />;
  }
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link to="/studio" className="text-sm font-medium text-muted hover:text-ink">
          Studio
        </Link>
        <UserButton />
      </div>
    );
  }
  return null;
}

export function SiteHeader({ tone = "page" }: { tone?: "page" | "flush" }) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-5 sm:px-8",
        tone === "page" && "border-b border-border/70",
      )}
    >
      <Link to="/" className="flex min-w-0 items-center gap-3">
        <BrandMark className="size-9 shrink-0" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-lg tracking-tight text-ink">
            {STUDIO.name}
          </span>
        </span>
      </Link>
      <AuthSlot />
    </header>
  );
}
