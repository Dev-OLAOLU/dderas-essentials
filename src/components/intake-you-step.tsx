import { BodyMap } from "@/components/body-map";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRESSURE_OPTIONS, type IntakeDraft } from "@/lib/intake-schema";
import { cn } from "@/lib/utils";

export function YouStep({
  draft,
  errors,
  onChange,
}: {
  draft: IntakeDraft;
  errors: Record<string, string>;
  onChange: (partial: Partial<IntakeDraft>) => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}>
          <Input
            value={draft.fullName}
            autoComplete="name"
            onChange={(event) => onChange({ fullName: event.target.value })}
          />
        </Field>
        <Field label="Phone number" error={errors.phone}>
          <Input
            value={draft.phone}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0801 234 5678"
            onChange={(event) => onChange({ phone: event.target.value })}
          />
        </Field>
      </div>
      <Field
        label="Email (optional)"
        hint="We email your quote if you leave one"
        error={errors.clientEmail}
      >
        <Input
          type="email"
          value={draft.clientEmail}
          autoComplete="email"
          onChange={(event) => onChange({ clientEmail: event.target.value })}
        />
      </Field>
      <Field label="Any injuries or conditions?" error={errors.injuriesFlag}>
        <div className="flex gap-2">
          {[true, false].map((flag) => (
            <button
              key={String(flag)}
              type="button"
              onClick={() => onChange({ injuriesFlag: flag })}
              className={cn(
                "h-11 flex-1 rounded-md border text-sm",
                draft.injuriesFlag === flag
                  ? "border-ink bg-ink text-primary-fg"
                  : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              {flag ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </Field>
      {draft.injuriesFlag ? (
        <Field label="Brief detail" error={errors.injuriesDetail}>
          <Textarea
            value={draft.injuriesDetail}
            placeholder="What should she avoid or ease into?"
            onChange={(event) => onChange({ injuriesDetail: event.target.value })}
          />
        </Field>
      ) : null}
      <Field label="Allergies" error={errors.allergies}>
        <Input
          value={draft.allergies}
          placeholder="Oils, nuts, latex — or leave blank"
          onChange={(event) => onChange({ allergies: event.target.value })}
        />
      </Field>
      <Field label="Areas of focus" error={errors.areasOfFocus}>
        <BodyMap
          selected={draft.areasOfFocus}
          onChange={(areasOfFocus) => onChange({ areasOfFocus })}
        />
      </Field>
      <Field label="Preferred pressure" error={errors.pressure}>
        <div className="flex flex-wrap gap-2">
          {PRESSURE_OPTIONS.map((option) => {
            const on = draft.pressure === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange({ pressure: option.id })}
                className={cn(
                  "h-11 rounded-full border px-4 text-sm",
                  on ? "border-ink bg-ink text-primary-fg" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}
