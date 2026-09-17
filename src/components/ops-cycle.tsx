import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getNotifyEmail, getOpsSnapshot, updateNotifyEmail, type CycleBlock, type OpsSnapshot } from "@/lib/studio";
import { STUDIO, naira } from "@/lib/intake-schema";
import { cn, formatDisplayDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-subtle">New cycle</span>;
  }
  if (value === 0) {
    return <span className="text-xs text-subtle">Flat vs last</span>;
  }
  const up = value > 0;
  return (
    <span className={cn("text-xs tabular-nums", up ? "text-primary" : "text-danger")}>
      {up ? "+" : ""}
      {value}% vs last
    </span>
  );
}

function CycleChart({
  days,
  metric,
}: {
  days: CycleBlock["days"];
  metric: "successful" | "revenue";
}) {
  const max = Math.max(1, ...days.map((day) => (metric === "revenue" ? day.revenue : day.successful)));
  const dense = days.length > 10;

  return (
    <div className="mt-5 flex h-36 items-end gap-1 sm:gap-1.5">
      {days.map((day) => {
        const raw = metric === "revenue" ? day.revenue : day.successful;
        const height = Math.max(raw > 0 ? 10 : 3, Math.round((raw / max) * 100));
        return (
          <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-28 w-full items-end justify-center">
              <div
                title={`${formatDisplayDate(day.date)} · ${metric === "revenue" ? naira(raw) : `${raw} visits`}`}
                className={cn(
                  "w-full max-w-8 rounded-sm transition-[height] duration-200",
                  raw > 0 ? "bg-primary" : "bg-surface-2",
                )}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className={cn("text-xs uppercase tracking-wide text-subtle", dense && "hidden sm:inline")}>
              {dense ? day.date.slice(8) : day.label.slice(0, 2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CycleCard({
  block,
  metric,
}: {
  block: CycleBlock;
  metric: "successful" | "revenue";
}) {
  const value = metric === "revenue" ? naira(block.revenue) : String(block.successful);
  const unit = metric === "revenue" ? "collected" : "successful visits";
  const delta = metric === "revenue" ? block.revenueDelta : block.successfulDelta;

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{block.label}</p>
          <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-sm text-muted">{unit}</p>
        </div>
        <Delta value={delta} />
      </div>
      <CycleChart days={block.days} metric={metric} />
    </article>
  );
}

export function OpsCycle() {
  const [ops, setOps] = useState<OpsSnapshot | null>(null);
  const [metric, setMetric] = useState<"successful" | "revenue">("successful");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getOpsSnapshot(), getNotifyEmail()])
      .then(([snapshot, notify]) => {
        if (cancelled) return;
        setOps(snapshot);
        setEmail(notify.email);
        setSavedEmail(notify.email);
      })
      .catch(() => {
        if (!cancelled) setOps(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const todayLine = useMemo(() => {
    if (!ops) return "Loading operations…";
    const visits = ops.today.successful;
    const money = ops.today.revenue;
    if (visits === 0 && money === 0) return "No completed visits on the board yet today.";
    return `${visits} successful · ${naira(money)} collected today`;
  }, [ops]);

  async function saveEmail() {
    setSaving(true);
    try {
      const result = await updateNotifyEmail({ data: email.trim() });
      setSavedEmail(result.email);
      toast.success(
        result.email
          ? "Notification email saved. Confirm the first FormSubmit message in that inbox."
          : "Notification email cleared",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save email");
    } finally {
      setSaving(false);
    }
  }

  if (!ops) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-56 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Operations</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Weekly & monthly cycle</h2>
          <p className="mt-2 text-sm text-muted">{todayLine}</p>
        </div>
        <div className="flex rounded-full border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMetric("successful")}
            className={cn(
              "h-10 rounded-full px-4 text-sm",
              metric === "successful" ? "bg-ink text-primary-fg" : "text-muted hover:text-ink",
            )}
          >
            Visits
          </button>
          <button
            type="button"
            onClick={() => setMetric("revenue")}
            className={cn(
              "h-10 rounded-full px-4 text-sm",
              metric === "revenue" ? "bg-ink text-primary-fg" : "text-muted hover:text-ink",
            )}
          >
            Money
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-ink px-5 py-4 text-primary-fg">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-fg/60">Today</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">
            {metric === "revenue" ? naira(ops.today.revenue) : ops.today.successful}
          </p>
          <p className="mt-1 text-sm text-primary-fg/70">
            {ops.today.bookings} booked · {ops.today.successful} successful
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">This week</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">
            {metric === "revenue" ? naira(ops.week.revenue) : ops.week.successful}
          </p>
          <div className="mt-1">
            <Delta value={metric === "revenue" ? ops.week.revenueDelta : ops.week.successfulDelta} />
          </div>
        </article>
        <article className="rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{ops.month.label}</p>
          <p className="mt-2 font-display text-3xl tabular-nums tracking-tight">
            {metric === "revenue" ? naira(ops.month.revenue) : ops.month.successful}
          </p>
          <div className="mt-1">
            <Delta value={metric === "revenue" ? ops.month.revenueDelta : ops.month.successfulDelta} />
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CycleCard block={ops.week} metric={metric} />
        <CycleCard block={ops.month} metric={metric} />
      </div>

      <article className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Booking alerts</p>
        <h3 className="mt-1 font-display text-2xl tracking-tight">Booking alerts</h3>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every new intake is saved on this desk and emailed to Chidera
          ({STUDIO.email}). When she sends a quote, the client is emailed too if they left an
          address. Add a second inbox for the other administrator. Confirm the first FormSubmit
          message in each inbox — after that, bookings arrive as a table.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Second administrator email">
              <Input
                type="email"
                placeholder="studio@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={saving || email.trim() === savedEmail}
            onClick={() => void saveEmail()}
          >
            {saving ? "Saving…" : "Save email"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-subtle">
          {savedEmail
            ? `Currently forwarding to ${savedEmail}.`
            : "Chidera is always copied. Add the second administrator before operations commence."}
        </p>
      </article>
    </section>
  );
}
