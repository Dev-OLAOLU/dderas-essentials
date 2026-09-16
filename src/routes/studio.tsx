import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteHeader } from "@/components/site-header";
import { ensureAmbassador, type AmbassadorPublic } from "@/lib/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({ component: StudioLayout });

function StudioNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const vault = pathname.startsWith("/studio/vault");
  const operations = !vault;

  return (
    <nav className="border-b border-border px-5 sm:px-8">
      <div className="mx-auto flex max-w-6xl gap-1">
        <Link
          to="/studio"
          className={cn(
            "inline-flex h-12 items-center border-b-2 px-3 text-sm font-medium",
            operations ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          Operations
        </Link>
        <Link
          to="/studio/vault"
          className={cn(
            "inline-flex h-12 items-center border-b-2 px-3 text-sm font-medium",
            vault ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          Vault
        </Link>
      </div>
    </nav>
  );
}

function StudioLayout() {
  const { user, isPending } = useCurrentUserState();
  const [gate, setGate] = useState<"pending" | "ok" | "denied">("pending");
  const [roster, setRoster] = useState<AmbassadorPublic[]>([]);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setGate("pending");
      return;
    }
    let cancelled = false;
    ensureAmbassador()
      .then((result) => {
        if (cancelled) return;
        setRoster(result.roster);
        setGate("ok");
      })
      .catch(() => {
        if (!cancelled) setGate("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, isPending]);

  if (isPending || (user && gate === "pending")) {
    return (
      <div className="min-h-screen bg-bg">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="h-10 w-48 animate-pulse rounded-md bg-surface-2" />
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-surface-2" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  if (gate === "denied") {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-5 py-20 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Access refused
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Not an ambassador</h1>
          <p className="mt-4 text-sm text-muted">
            Studio operations are limited to two profiles associated with D-Dera’s Essentials.
            This account is not one of them.
          </p>
          <div className="mt-8 flex justify-center">
            <UserButton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <StudioNav />
      <Outlet />
      {roster.length ? (
        <p className="sr-only">
          Ambassador seats: {roster.map((row) => row.displayName).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
