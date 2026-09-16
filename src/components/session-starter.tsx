import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALL_SERVICES,
  EXTRAS,
  durationsFor,
  extrasFee,
  getService,
  grandTotal,
  isCoreService,
  naira,
  serviceFee,
} from "@/lib/intake-schema";
import { cn } from "@/lib/utils";

const SHORT: Record<string, string> = {
  swedish: "Swedish",
  "deep-tissue": "Deep tissue",
  aromatherapy: "Aromatherapy",
  asmr: "ASMR",
};

const EXTRA_SHORT: Record<string, string> = {
  "head-neck-shoulder": "Head & neck",
  "back-relief": "Back relief",
  "foot-reflexology": "Foot reflexology",
  scalp: "Scalp",
};

export function SessionStarter() {
  const [serviceId, setServiceId] = useState("swedish");
  const [minutes, setMinutes] = useState(60);
  const [extras, setExtras] = useState<string[]>([]);

  const service = getService(serviceId);
  const core = isCoreService(serviceId);
  const durations = durationsFor(serviceId);
  const total = grandTotal(serviceFee(serviceId, minutes), extrasFee(extras), 0);

  function pickService(id: string) {
    setServiceId(id);
    const next = durationsFor(id);
    if (!next.includes(minutes)) setMinutes(next[0] ?? 60);
    if (!isCoreService(id)) setExtras([]);
  }

  function toggleExtra(id: string) {
    setExtras((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        Start here
      </p>
      <h2 className="mt-1 font-display text-2xl tracking-tight text-ink sm:text-3xl">
        Build your session
      </h2>
      <p className="mt-1 text-sm text-muted">
        Tap a therapy. The price updates as you go.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_SERVICES.map((item) => {
          const on = serviceId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => pickService(item.id)}
              className={cn(
                "h-11 rounded-full border px-4 text-sm transition-colors duration-150",
                on
                  ? "border-ink bg-ink text-primary-fg"
                  : "border-border bg-bg text-ink hover:bg-surface-2",
              )}
            >
              {SHORT[item.id] ?? item.label}
            </button>
          );
        })}
      </div>

      {service ? <p className="mt-3 text-sm text-muted">{service.blurb}</p> : null}

      <p className="mt-4 text-sm font-medium text-ink">How long?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {durations.map((value) => {
          const on = minutes === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setMinutes(value)}
              className={cn(
                "h-11 rounded-full border px-4 text-sm transition-colors duration-150",
                on
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-bg text-ink hover:bg-surface-2",
              )}
            >
              {value} mins · {naira(serviceFee(serviceId, value))}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm font-medium text-ink">Add-ons</p>
      <p className="mt-1 text-xs text-subtle">
        {core ? "Optional · 30 mins each, with a core massage." : "Available only with a core massage."}
      </p>
      <div className={cn("mt-2 flex flex-wrap gap-2", !core && "opacity-50")}>
        {EXTRAS.map((extra) => {
          const on = extras.includes(extra.id);
          return (
            <button
              key={extra.id}
              type="button"
              disabled={!core}
              onClick={() => toggleExtra(extra.id)}
              className={cn(
                "h-11 rounded-full border px-3 text-sm transition-colors duration-150",
                on
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-bg text-ink hover:bg-surface-2",
              )}
            >
              {EXTRA_SHORT[extra.id] ?? extra.label} · {naira(extra.price)}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Session total</p>
          <p className="font-display text-3xl tabular-nums tracking-tight">{naira(total)}</p>
        </div>
        <p className="max-w-[9.5rem] text-right text-xs text-subtle">
          Transport confirmed after your address
        </p>
      </div>

      <Button asChild variant="secondary" size="lg" className="mt-4 w-full">
        <Link
          to="/book"
          search={{
            service: serviceId,
            mins: minutes,
            extras: extras.length ? extras.join(",") : undefined,
          }}
        >
          Continue to booking <ArrowRight />
        </Link>
      </Button>
      <p className="mt-2 text-center text-xs text-subtle">
        3 more questions · about 2 minutes
      </p>
    </div>
  );
}
