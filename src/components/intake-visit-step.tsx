import { Home } from "lucide-react";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoSlots } from "@/components/photo-slots";
import { CLIENT_FILE_CAP, CLIENT_KINDS, type PendingFile } from "@/lib/image";
import { TIME_SLOTS, type IntakeDraft } from "@/lib/intake-schema";
import { cn, formatTimeLabel, todayIso } from "@/lib/utils";

export function VisitStep({
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
        Transport is agreed with D-Dera on WhatsApp after you send this form.
      </p>
    </div>
  );
}
