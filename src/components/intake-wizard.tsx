import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "@tanstack/react-router";
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
  bookingWhatsAppMessage,
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
import { cn, formatDisplayDate, formatTimeLabel, todayIso, whatsappHref } from "@/lib/utils";

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
  const [done, setDone] = useState<{ reference: string; total: number; token: string } | null>(null);

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
      "clientEmail",
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
      const result = await submitIntake({
        data: {
          ...parsed,
          origin: typeof window !== "undefined" ? window.location.origin : "",
        },
      });
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

      const sessionFee = result.serviceFee + result.extrasFee;
      const waMessage = bookingWhatsAppMessage({
        reference: result.reference,
        fullName: parsed.fullName,
        phone: parsed.phone,
        serviceArea: parsed.serviceArea,
        addressExact: parsed.addressExact,
        preferredDate: parsed.preferredDate,
        preferredTime: parsed.preferredTime,
        serviceType: parsed.serviceType,
        durationMinutes: parsed.durationMinutes,
        extras: parsed.extras,
        serviceFee: result.serviceFee,
        extrasFee: result.extrasFee,
      });
      const waUrl = whatsappHref(STUDIO.whatsappE164, waMessage);
      try {
        // Open WhatsApp with the booking details so transport can be discussed next.
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } catch {
        /* popup blocked — visit page still has a WhatsApp button */
      }

      setDone({ reference: result.reference, total: sessionFee, token: result.clientToken });
      toast.success("Booking received — continue on WhatsApp");
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
      <Navigate
        to="/visit/$reference"
        params={{ reference: done.reference }}
        search={{ k: done.token, fresh: "1" }}
      />
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
              {submitting ? "Sending…" : "Send to D-Dera on WhatsApp"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
