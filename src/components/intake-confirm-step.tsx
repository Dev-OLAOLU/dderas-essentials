import { useMemo } from "react";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import {
  ALL_SERVICES,
  EXTRAS,
  naira,
  type IntakeDraft,
} from "@/lib/intake-schema";
import { formatDisplayDate, formatTimeLabel } from "@/lib/utils";

export function ConfirmStep({
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
      ["When", `${dateLabel} · ${draft.preferredTime ? formatTimeLabel(draft.preferredTime) : "—"}`],
      ["Name", draft.fullName || "—"],
      ["Phone", draft.phone || "—"],
      ["Email", draft.clientEmail || "Not given"],
      ["Pressure", draft.pressure],
    ],
    [draft, service, extraTime, dateLabel],
  );

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Summary</p>
        <dl className="mt-4 grid gap-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
          {extraRows.length ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Extras</dt>
              <dd className="text-right font-medium">
                {extraRows.map((item) => item.label).join(", ")}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-border pt-3">
            <dt className="text-muted">Session total</dt>
            <dd className="font-medium tabular-nums">{naira(total)}</dd>
          </div>
          <p className="text-xs text-muted">Transport is agreed by email after you send this form.</p>
        </dl>
      </section>

      <Field
        label="Type your full name to confirm"
        error={errors.consentName}
      >
        <Input
          value={draft.consentName}
          onChange={(event) => onChange({ consentName: event.target.value })}
        />
      </Field>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={draft.consentPolicy}
          onChange={(event) => onChange({ consentPolicy: event.target.checked })}
        />
        <span>
          I confirm the details above are correct and agree to D-Dera's home-visit booking policy.
          {errors.consentPolicy ? (
            <span className="mt-1 block text-danger">{errors.consentPolicy}</span>
          ) : null}
        </span>
      </label>
    </div>
  );
}
