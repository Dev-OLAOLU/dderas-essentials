import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { listIntakes } from "@/lib/intakes";
import { ensureAmbassador, type AmbassadorPublic } from "@/lib/studio";
import {
  naira,
  serviceLabel,
  statusLabel,
  type IntakeStatus,
  type IntakeSummary,
} from "@/lib/intake-schema";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OpsCycle } from "@/components/ops-cycle";
import { cn, formatDisplayDate, formatTimeLabel } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({ component: StudioIndex });

function StudioIndex() {
  const [rows, setRows] = useState<IntakeSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<IntakeStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<AmbassadorPublic[]>([]);

  useEffect(() => {
    let cancelled = false;
    listIntakes()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load bookings";
        setError(message);
        setRows([]);
      });
    ensureAmbassador()
      .then((result) => {
        if (!cancelled) setRoster(result.roster);
      })
      .catch(() => {
        /* layout already gates access */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      const hay = [
        row.fullName,
        row.phone,
        row.serviceArea,
        row.reference,
        serviceLabel(row.serviceType),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, query, status]);

  const newCount = rows?.filter((row) => row.status === "new").length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Studio</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Operations</h1>
        <p className="mt-2 text-sm text-muted">
          {rows === null
            ? "Loading bookings…"
            : newCount === 0
              ? "No new intakes waiting."
              : `${newCount} new intake${newCount === 1 ? "" : "s"} to review.`}
        </p>
      </div>

      <div className="mt-8">
        <OpsCycle />
      </div>

      {roster.length ? (
        <section className="mt-10 rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Ambassador seats
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {roster.map((person) => (
              <li
                key={person.seat}
                className="flex items-center justify-between rounded-lg bg-bg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    Seat {person.seat}
                    {person.isYou ? " · you" : ""}
                  </p>
                  <p className="text-sm text-muted">{person.displayName}</p>
                </div>
                <p className="text-xs text-subtle">{person.emailMasked}</p>
              </li>
            ))}
            {roster.length < 2 ? (
              <li className="flex items-center rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                Seat {roster.length + 1} open — the next authorised sign-in claims it.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <div className="mt-12">
        <h2 className="font-display text-3xl tracking-tight">Client bookings</h2>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input
              className="pl-10"
              placeholder="Search name, phone, area, reference"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "new", "quoted", "confirmed", "completed"] as const).map((item) => {
              const on = status === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={cn(
                    "h-11 rounded-full border px-4 text-sm capitalize",
                    on ? "border-ink bg-ink text-primary-fg" : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  {item === "all" ? "All" : statusLabel(item)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}

      {rows === null ? (
        <div className="mt-8 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-2xl">No bookings yet</p>
          <p className="mt-2 text-sm text-muted">
            When a client completes the intake, they appear here with everything you need
            for the visit.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {filtered.map((row) => (
            <li key={row.id}>
              <Link
                to="/studio/$id"
                params={{ id: String(row.id) }}
                className="block rounded-xl border border-border bg-surface p-5 transition-colors duration-150 hover:bg-surface-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{row.fullName}</p>
                    <p className="mt-1 text-sm text-muted">
                      {serviceLabel(row.serviceType)} · {row.durationMinutes} mins
                      {row.extras.length
                        ? ` + ${row.extras.length} extra${row.extras.length === 1 ? "" : "s"}`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDisplayDate(row.preferredDate)} · {formatTimeLabel(row.preferredTime)} · {row.serviceArea}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={row.status === "new" ? "primary" : "muted"}>
                      {statusLabel(row.status)}
                    </Badge>
                    <p className="mt-2 text-sm tabular-nums font-medium">{naira(row.grandTotal)}</p>
                    <p className="text-xs text-subtle">{row.reference}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
