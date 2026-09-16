import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Home, Plus } from "lucide-react";
import { toast } from "sonner";
import { BodyMap } from "@/components/body-map";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoSlots } from "@/components/photo-slots";
import { BrandMark } from "@/components/mark";
import { submitIntake } from "@/lib/intakes";
import { attachClientFile } from "@/lib/files";
import { CLIENT_FILE_CAP, CLIENT_KINDS, type PendingFile } from "@/lib/image";
import {
  ALL_SERVICES,
  ASMR_SERVICE,
  CORE_SERVICES,
  EXTRAS,
  PRESSURE_OPTIONS,
  STUDIO,
  TIME_SLOTS,
  durationsFor,
  emptyDraft,
  extrasFee,
  extrasMinutes,
  getService,
  grandTotal,
  intakeInputSchema,
  isCoreService,
  naira,
  serviceFee,
  type IntakeDraft,
} from "@/lib/intake-schema";
import { cn, formatDisplayDate, formatTimeLabel, todayIso } from "@/lib/utils";

const DRAFT_KEY = "ddera-intake-draft-v1";
const STEPS = [
  { id: "session", title: "Your session" },
  { id: "visit", title: "When & where" },
  { id: "you", title: "About you" },
  { id: "confirm", title: "Confirm" },
] as const;

function loadDraft(): IntakeDraft {
  const base = emptyDraft();
  base.preferredDate = todayIso();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) as Partial<IntakeDraft>) };
  } catch {
    return base;
  }
}

function saveDraft(draft: IntakeDraft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function presetFromLocation(preset?: {
  service?: string;
  mins?: number | string;
  extras?: string;
}): { service?: string; mins?: number | string; extras?: string } {
  if (typeof window === "undefined") return preset ?? {};
  const query = new URLSearchParams(window.location.search);
  return {
    service: preset?.service ?? query.get("service") ?? undefined,
    mins: preset?.mins ?? query.get("mins") ?? undefined,
    extras: preset?.extras ?? query.get("extras") ?? undefined,
  };
}

function applyPreset(
  draft: IntakeDraft,
  preset?: { service?: string; mins?: number | string; extras?: string },
): IntakeDraft {
  const next = { ...draft };
  if (!preset?.service || !getService(preset.service)) return next;
  next.serviceType = preset.service;
  const allowed = durationsFor(preset.service);
  const mins = Number(preset.mins);
  next.durationMinutes = allowed.includes(mins) ? mins : (allowed[0] ?? 60);
  if (isCoreService(preset.service) && preset.extras) {
    const allowedExtras = new Set<string>(EXTRAS.map((item) => item.id));
    next.extras = preset.extras.split(",").filter((id) => allowedExtras.has(id));
  } else if (!isCoreService(preset.service)) {
    next.extras = [];
  }
  return next;
}

export function IntakeWizard({
  preset,
}: {
  preset?: { service?: string; mins?: number; extras?: string };
}) {
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<IntakeDraft>(() => applyPreset(emptyDraft(), preset));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PendingFile[]>([]);
  const [done, setDone] = useState<{ reference: string; total: number } | null>(null);

  useEffect(() => {
    setDraft(applyPreset(loadDraft(), presetFromLocation(preset)));
    setHydrated(true);
  }, [preset?.service, preset?.mins, preset?.extras]);

  useEffect(() => {
    if (!hydrated || done) return;
    saveDraft(draft);
  }, [draft, done, hydrated]);

  const allowedDurations = durationsFor(draft.serviceType);
  const core = isCoreService(draft.serviceType);
  const svcFee = serviceFee(draft.serviceType, draft.durationMinutes);
  const extraCost = extrasFee(draft.extras);
  const extraTime = extrasMinutes(draft.extras);
  const total = grandTotal(svcFee, extraCost, 0);

  function patch(partial: Partial<IntakeDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setErrors({});
  }

  function selectService(id: string) {
    const durations = durationsFor(id);
    const nextDuration = durations.includes(draft.durationMinutes)
      ? draft.durationMinutes
      : (durations[0] ?? 60);
    patch({
      serviceType: id,
      durationMinutes: nextDuration,
      extras: isCoreService(id) ? draft.extras : [],
    });
  }

  const stepFields: string[][] = [
    ["serviceType", "durationMinutes", "extras"],
    ["preferredDate", "preferredTime", "serviceArea", "addressExact"],
    [
      "fullName",
      "phone",
      "injuriesFlag",
      "injuriesDetail",
      "allergies",
      "areasOfFocus",
      "pressure",
    ],
    ["consentName", "consentPolicy"],
  ];

  function validateStep(index: number): boolean {
    const parsed = intakeInputSchema.safeParse({ ...draft, consentPolicy: true });
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (stepFields[index]?.includes(key) && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
    }
    if (index === 3 && !draft.consentPolicy) {
      nextErrors.consentPolicy = "Please confirm the booking policy";
    }
    if (index === 3 && !parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  async function submit() {
    if (!validateStep(3)) return;
    setSubmitting(true);
    try {
      const parsed = intakeInputSchema.parse(draft);
      const result = await submitIntake({ data: parsed });
      if (photos.length) {
        try {
          for (const photo of photos) {
            await attachClientFile({
              data: {
                intakeId: result.id,
                reference: result.reference,
                kind: photo.kind,
                filename: photo.filename,
                mime: "image/jpeg",
                data: photo.data,
              },
            });
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `${error.message} Booking is in — send photos on WhatsApp if needed.`
              : "Booking is in — send photos on WhatsApp if needed.",
          );
        }
      }
      clearDraft();
      setPhotos([]);
      setDone({ reference: result.reference, total: result.grandTotal });
      toast.success("Booking received");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send your form";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 py-12 text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-primary text-primary-fg">
          <Check className="size-7" strokeWidth={2.2} />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Booking received
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-ink">
          You’re on the list.
        </h1>
        <p className="mt-4 text-muted">
          D-Dera will confirm your home visit and transport once your intake is reviewed.
          Keep this reference handy.
        </p>
        <p className="mt-8 font-display text-3xl tracking-tight text-ink">{done.reference}</p>
        <p className="mt-2 text-sm text-muted">
          Session total {naira(done.total)}
          {done.total > 0 ? " · transport confirmed separately" : ""}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary">
            <a
              href={`https://wa.me/${STUDIO.whatsappE164}?text=${encodeURIComponent(`Hi D-Dera, I just submitted intake ${done.reference}.`)}`}
            >
              Message on WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-28 pt-6 sm:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            {STEPS[step]?.title}
          </h1>
        </div>
        <BrandMark className="hidden size-12 sm:block" />
      </div>
      <div className="mb-8 h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {step === 0 ? (
        <SessionStep
          draft={draft}
          errors={errors}
          core={core}
          allowedDurations={allowedDurations}
          onService={selectService}
          onDuration={(minutes) => patch({ durationMinutes: minutes })}
          onExtra={(id) => patch({ extras: toggleIn(draft.extras, id) })}
        />
      ) : null}
      {step === 1 ? (
        <VisitStep draft={draft} errors={errors} onChange={patch} photos={photos} onPhotos={setPhotos} />
      ) : null}
      {step === 2 ? (
        <YouStep draft={draft} errors={errors} onChange={patch} />
      ) : null}
      {step === 3 ? (
        <ConfirmStep
          draft={draft}
          errors={errors}
          svcFee={svcFee}
          extraCost={extraCost}
          extraTime={extraTime}
          total={total}
          onChange={patch}
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-bg/95 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {step === 0 ? (
            <Button asChild variant="ghost">
              <Link to="/">
                <ArrowLeft /> Cancel
              </Link>
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setStep((v) => v - 1)}>
              <ArrowLeft /> Back
            </Button>
          )}
          <div className="hidden text-sm text-muted sm:block">
            {svcFee > 0 ? naira(total) : "Choose a session"}
          </div>
          {step < 3 ? (
            <Button type="button" variant="secondary" onClick={next}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={submitting} onClick={() => void submit()}>
              {submitting ? "Sending…" : "Send to D-Dera"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionStep({
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

function ServiceCard({
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

function VisitStep({
  draft,
  errors,
  onChange,
  photos,
  onPhotos,
}: {
  draft: IntakeDraft;
  errors: Record<string, string>;
  onChange: (partial: Partial<IntakeDraft>) => void;
  photos: PendingFile[];
  onPhotos: (next: PendingFile[]) => void;
}) {
  const minDate = todayIso();
  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-3 rounded-xl bg-surface-2/80 px-4 py-3 text-sm text-muted">
        <Home className="mt-0.5 size-4 shrink-0 text-primary" />
        Only home services are available for now. D-Dera comes to you.
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Preferred date" error={errors.preferredDate}>
          <Input
            type="date"
            min={minDate}
            value={draft.preferredDate}
            onChange={(event) => onChange({ preferredDate: event.target.value })}
          />
        </Field>
        <Field label="Preferred start time" error={errors.preferredTime}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TIME_SLOTS.map((slot) => {
              const on = draft.preferredTime === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChange({ preferredTime: slot })}
                  className={cn(
                    "h-11 rounded-md border text-sm",
                    on ? "border-ink bg-ink text-primary-fg" : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  {formatTimeLabel(slot)}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
      <Field
        label="Location / service area"
        hint="Estate, area, or city"
        error={errors.serviceArea}
      >
        <Input
          value={draft.serviceArea}
          placeholder="e.g. Lekki Phase 1, Lagos"
          onChange={(event) => onChange({ serviceArea: event.target.value })}
        />
      </Field>
      <Field
        label="Exact address"
        hint="Building no., street name"
        error={errors.addressExact}
      >
        <Textarea
          value={draft.addressExact}
          placeholder="House number, street, landmark, gate instructions"
          onChange={(event) => onChange({ addressExact: event.target.value })}
        />
      </Field>
      <div className="grid gap-3">
        <p className="text-sm font-medium text-ink">Photos for the visit</p>
        <p className="text-sm text-muted">
          Optional. A picture of the entrance helps her find you. A deposit screenshot is enough if you already paid transport.
        </p>
        <PhotoSlots kinds={CLIENT_KINDS} value={photos} onChange={onPhotos} cap={CLIENT_FILE_CAP} />
      </div>
      <p className="text-sm text-muted">
        Transportation fee is confirmed after D-Dera reviews your location. Slots and travel
        are confirmed once this form and the advance transport deposit are received.
      </p>
    </div>
  );
}

function YouStep({
  draft,
  errors,
  onChange,
}: {
  draft: IntakeDraft;
  errors: Record<string, string>;
  onChange: (partial: Partial<IntakeDraft>) => void;
}) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}>
          <Input
            autoComplete="name"
            value={draft.fullName}
            onChange={(event) => onChange({ fullName: event.target.value })}
          />
        </Field>
        <Field label="Phone (WhatsApp & direct call)" error={errors.phone}>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+234"
            value={draft.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
          />
        </Field>
      </div>

      <section className="grid gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          Health & safety screening
        </h2>
        <Field label="Any recent injuries, chronic pain, or surgeries?">
          <div className="flex gap-2">
            {[
              { value: false, label: "No" },
              { value: true, label: "Yes" },
            ].map((option) => {
              const on = draft.injuriesFlag === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() =>
                    onChange({
                      injuriesFlag: option.value,
                      injuriesDetail: option.value ? draft.injuriesDetail : "",
                    })
                  }
                  className={cn(
                    "h-11 min-w-20 rounded-full border px-5 text-sm",
                    on ? "border-ink bg-ink text-primary-fg" : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </Field>
        {draft.injuriesFlag ? (
          <Field label="Please share a short detail" error={errors.injuriesDetail}>
            <Textarea
              value={draft.injuriesDetail}
              placeholder="What happened, where it sits in the body, and anything I should avoid"
              onChange={(event) => onChange({ injuriesDetail: event.target.value })}
            />
          </Field>
        ) : null}
        <Field
          label="Skin sensitivities or allergies to oils / lotions?"
          hint="Optional"
          error={errors.allergies}
        >
          <Textarea
            value={draft.allergies}
            placeholder="Nut oils, fragrance, latex, or anything that bothers your skin"
            onChange={(event) => onChange({ allergies: event.target.value })}
          />
        </Field>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          Session preferences
        </h2>
        <Field
          label="Specific focus areas"
          hint="Lower back, shoulders, legs…"
          error={errors.areasOfFocus}
        >
          <BodyMap
            value={draft.areasOfFocus}
            onChange={(areasOfFocus) => onChange({ areasOfFocus })}
          />
        </Field>
        <Field label="Preferred pressure level" error={errors.pressure}>
          <div className="grid grid-cols-3 gap-2">
            {PRESSURE_OPTIONS.map((option) => {
              const on = draft.pressure === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange({ pressure: option.id })}
                  className={cn(
                    "h-12 rounded-lg border text-sm font-medium",
                    on ? "border-ink bg-ink text-primary-fg" : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </Field>
      </section>
    </div>
  );
}

function ConfirmStep({
  draft,
  errors,
  svcFee,
  extraCost,
  extraTime,
  total,
  onChange,
}: {
  draft: IntakeDraft;
  errors: Record<string, string>;
  svcFee: number;
  extraCost: number;
  extraTime: number;
  total: number;
  onChange: (partial: Partial<IntakeDraft>) => void;
}) {
  const service = ALL_SERVICES.find((item) => item.id === draft.serviceType);
  const extraRows = EXTRAS.filter((item) => draft.extras.includes(item.id));
  const dateLabel = draft.preferredDate ? formatDisplayDate(draft.preferredDate) : "—";

  const rows = useMemo(
    () => [
      ["Service type", service?.label ?? "—"],
      ["Session duration", `${draft.durationMinutes} mins${extraTime ? ` + ${extraTime} mins extras` : ""}`],
      ["Location / service area", draft.serviceArea || "—"],
      ["Exact address", draft.addressExact || "—"],
      ["Preferred start", `${dateLabel} · ${draft.preferredTime ? formatTimeLabel(draft.preferredTime) : "—"}`],
      ["Full name", draft.fullName || "—"],
      ["Phone", draft.phone || "—"],
      ["Pressure", draft.pressure],
    ],
    [service, draft, extraTime, dateLabel],
  );

  return (
    <div className="grid gap-8">
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="bg-ink px-5 py-4 text-primary-fg">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-fg/70">
            Massage therapy booking confirmation
          </p>
          <p className="mt-1 font-display text-2xl">Mobile & home service</p>
        </div>
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr]">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="divide-y divide-border border-t border-border bg-surface-2/40">
          <PriceRow label="Service fee" value={naira(svcFee)} />
          {extraRows.map((extra) => (
            <PriceRow
              key={extra.id}
              label={extra.label}
              value={naira(extra.price)}
            />
          ))}
          <PriceRow label="Transportation fee" value="To be confirmed" />
          <PriceRow label="Grand total" value={naira(total)} emphasis />
        </div>
      </section>

      <Field label="Type your full name to confirm" error={errors.consentName}>
        <Input
          value={draft.consentName}
          placeholder={draft.fullName || "Your name"}
          onChange={(event) => onChange({ consentName: event.target.value })}
        />
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-border bg-mint/60 p-4 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={draft.consentPolicy}
          onChange={(event) => onChange({ consentPolicy: event.target.checked })}
        />
        <span>
          <span className="font-medium">Booking & confirmation policy. </span>
          Appointment slots and travel arrangements are confirmed upon receipt of the
          completed intake form and the required advance transport fee/deposit.
        </span>
      </label>
      {errors.consentPolicy ? (
        <p className="-mt-6 text-sm text-danger">{errors.consentPolicy}</p>
      ) : null}
    </div>
  );
}

function PriceRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 py-3 text-sm",
        emphasis && "bg-mint font-medium",
      )}
    >
      <span className={emphasis ? "text-ink" : "text-muted"}>{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
