import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Home, Plus } from "lucide-react";
import { BodyMap } from "@/components/body-map";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoSlots } from "@/components/photo-slots";
import { CLIENT_FILE_CAP, CLIENT_KINDS, type PendingFile } from "@/lib/image";
import {
  ALL_SERVICES,
  ASMR_SERVICE,
  CORE_SERVICES,
  EXTRAS,
  PRESSURE_OPTIONS,
  TIME_SLOTS,
  naira,
  serviceFee,
  type IntakeDraft,
} from "@/lib/intake-schema";
import { cn, formatDisplayDate, formatTimeLabel, todayIso } from "@/lib/utils";

export function SessionStep({
  draft,
  errors,
  core,
  allowedDurations,
  onService,
  onDuration,
  onExtra,
}: {
  draft: IntakeDraft;
  errors: Record<string, string>;
  core: boolean;
  allowedDurations: number[];
  onService: (id: string) => void;
  onDuration: (minutes: number) => void;
  onExtra: (id: string) => void;
}) {
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          Core massage therapies
        </h2>
        <div className="mt-4 grid gap-3">
          {CORE_SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              selected={draft.serviceType === service.id}
              title={service.label}
              blurb={service.blurb}
              prices={service.prices}
              onSelect={() => onService(service.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          ASMR services
        </h2>
        <div className="mt-4">
          <ServiceCard
            selected={draft.serviceType === ASMR_SERVICE.id}
            title={ASMR_SERVICE.label}
            blurb={ASMR_SERVICE.blurb}
            prices={ASMR_SERVICE.prices}
            onSelect={() => onService(ASMR_SERVICE.id)}
          />
        </div>
      </section>

      <Field label="Session duration" error={errors.durationMinutes}>
        <div className="flex flex-wrap gap-2">
          {allowedDurations.map((minutes) => {
            const selected = draft.durationMinutes === minutes;
            const price = serviceFee(draft.serviceType, minutes);
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => onDuration(minutes)}
                className={cn(
                  "h-12 rounded-full border px-4 text-sm transition-colors duration-150",
                  selected
                    ? "border-ink bg-ink text-primary-fg"
                    : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {minutes} mins · {naira(price)}
              </button>
            );
          })}
        </div>
      </Field>

      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
            Therapy extras
          </h2>
          <p className="text-xs text-subtle">Must be booked with a core therapy</p>
        </div>
        <div className={cn("mt-4 grid gap-3", !core && "opacity-50")}>
          {EXTRAS.map((extra) => {
            const on = draft.extras.includes(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                disabled={!core}
                onClick={() => onExtra(extra.id)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4 text-left transition-colors duration-150",
                  on ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                    on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
                  )}
                >
                  {on ? <Check className="size-4" /> : <Plus className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{extra.label}</span>
                    <span className="text-sm text-muted">
                      {extra.minutes} mins · {naira(extra.price)}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{extra.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.extras ? <p className="mt-2 text-sm text-danger">{errors.extras}</p> : null}
      </section>
    </div>
  );
}

export function ServiceCard({
  selected,
  title,
  blurb,
  prices,
  onSelect,
}: {
  selected: boolean;
  title: string;
  blurb: string;
  prices: Record<number, number> | { readonly [key: number]: number };
  onSelect: () => void;
}) {
  const entries = Object.entries(prices)
    .map(([minutes, price]) => ({ minutes: Number(minutes), price }))
    .sort((a, b) => a.minutes - b.minutes);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors duration-150 sm:p-5",
        selected ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="mt-1 text-sm text-muted">{blurb}</p>
        </div>
        <span
          className={cn(
            "mt-1 size-4 shrink-0 rounded-full border",
            selected ? "border-primary bg-primary" : "border-subtle bg-surface",
          )}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {entries.map((row) => (
          <span
            key={row.minutes}
            className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted"
          >
            {row.minutes} mins · {naira(row.price)}
          </span>
        ))}
      </div>
    </button>
  );
}
