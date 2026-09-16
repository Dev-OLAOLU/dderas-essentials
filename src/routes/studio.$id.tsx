import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { getIntake, updateBookingAdmin, updateIntakeStatus } from "@/lib/intakes";
import { listRevisions, restoreRevision, type RevisionSummary } from "@/lib/vault";
import {
  EXTRAS,
  STATUSES,
  naira,
  pressureLabel,
  serviceLabel,
  statusLabel,
  type IntakeRecord,
  type IntakeStatus,
  areaLabel,
} from "@/lib/intake-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { BookingPhotos } from "@/components/photo-slots";
import { cn, formatDateTime, formatDisplayDate, formatTimeLabel, whatsappHref } from "@/lib/utils";

export const Route = createFileRoute("/studio/$id")({ component: StudioDetailPage });

function StudioDetailPage() {
  const { id } = Route.useParams();
  const [record, setRecord] = useState<IntakeRecord | null | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [transport, setTransport] = useState("0");
  const [deposit, setDeposit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getIntake({ data: Number(id) })
      .then((row) => {
        if (cancelled) return;
        setRecord(row);
        if (row) {
          setNotes(row.therapistNotes);
          setTransport(String(row.transportFee));
          setDeposit(row.depositReceived);
        }
      })
      .catch(() => {
        if (!cancelled) setRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (record === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="h-40 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }
  if (!record) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p className="font-display text-3xl">Booking not found</p>
        <Link to="/studio" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to studio
        </Link>
      </main>
    );
  }

  const booking = record;
  const extras = booking.extras
    .map((extraId) => EXTRAS.find((item) => item.id === extraId))
    .filter((item): item is (typeof EXTRAS)[number] => Boolean(item));
  const sessionTotal = booking.serviceFee + booking.extrasFee;
  const transportNumber = Math.max(0, Math.round(Number(transport) || 0));
  const previewTotal = sessionTotal + transportNumber;

  async function saveAdmin() {
    setSaving(true);
    try {
      const result = await updateBookingAdmin({
        data: {
          id: booking.id,
          transportFee: transportNumber,
          depositReceived: deposit,
          notes,
        },
      });
      setRecord({
        ...booking,
        transportFee: transportNumber,
        grandTotal: result.grandTotal,
        depositReceived: deposit,
        therapistNotes: notes,
      });
      toast.success("Saved");
      setHistoryTick((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(next: IntakeStatus) {
    try {
      await updateIntakeStatus({ data: { id: booking.id, status: next } });
      setRecord({ ...booking, status: next });
      setHistoryTick((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    }
  }

  const clientWa = whatsappHref(
    booking.phone,
    `Hi ${booking.fullName.split(" ")[0]}, this is D-Dera confirming your ${serviceLabel(booking.serviceType)} on ${formatDisplayDate(booking.preferredDate)}.`,
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <Link
        to="/studio"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> All bookings
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {booking.reference}
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">{booking.fullName}</h1>
          <p className="mt-2 text-muted">
            {formatDisplayDate(booking.preferredDate)} · {formatTimeLabel(booking.preferredTime)}
          </p>
        </div>
        <Badge tone={booking.status === "new" ? "primary" : "muted"}>
          {statusLabel(booking.status)}
        </Badge>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void setStatus(item.id)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm",
              booking.status === item.id
                ? "border-ink bg-ink text-primary-fg"
                : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="bg-ink px-5 py-4 text-primary-fg">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-fg/70">
            Massage therapy booking confirmation
          </p>
          <p className="mt-1 text-sm">Mobile & home service appointment</p>
        </div>
        <dl className="divide-y divide-border px-5">
          <Row label="Service type" value={serviceLabel(booking.serviceType)} />
          <Row label="Session duration" value={`${booking.durationMinutes} mins`} />
          <Row
            label="Extras"
            value={
              extras.length
                ? extras.map((item) => `${item.label} (${naira(item.price)})`).join(", ")
                : "None"
            }
          />
          <Row label="Location / service area" value={booking.serviceArea} />
          <Row label="Exact address" value={booking.addressExact} />
          <Row label="Phone" value={booking.phone} />
          <Row label="Service fee" value={naira(booking.serviceFee)} />
          <Row label="Extras fee" value={naira(booking.extrasFee)} />
          <Row
            label="Transportation fee"
            value={booking.transportFee ? naira(booking.transportFee) : "Pending"}
          />
          <Row label="Grand total" value={naira(previewTotal)} mint />
        </dl>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          Client intake
        </h2>
        <dl className="mt-4 divide-y divide-border">
          <Row
            label="Injuries, chronic pain, or surgeries"
            value={
              booking.injuriesFlag
                ? booking.injuriesDetail || "Yes — no detail given"
                : "No"
            }
          />
          <Row
            label="Skin sensitivities / oil allergies"
            value={booking.allergies || "None noted"}
          />
          <Row
            label="Focus areas"
            value={
              booking.areasOfFocus.length
                ? booking.areasOfFocus.map(areaLabel).join(", ")
                : "Not specified"
            }
          />
          <Row label="Pressure" value={pressureLabel(booking.pressure)} />
          <Row label="Signed as" value={booking.consentName} />
        </dl>
      </section>

      <BookingPhotos intakeId={booking.id} />

      <section className="mt-8 mb-12 grid gap-5 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          Confirm visit
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Transportation fee (₦)">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={transport}
              onChange={(event) => setTransport(event.target.value)}
            />
          </Field>
          <label className="flex items-center gap-3 self-end pb-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={deposit}
              onChange={(event) => setDeposit(event.target.checked)}
            />
            Advance transport deposit received
          </label>
        </div>
        <p className="text-sm text-muted">
          Session {naira(sessionTotal)} + transport {naira(transportNumber)} ={" "}
          <span className="font-medium text-ink">{naira(previewTotal)}</span>
        </p>
        <Field label="Private notes">
          <Textarea
            value={notes}
            placeholder="Gate code, parking, oil choice, what you observed…"
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void saveAdmin()}>
            {saving ? "Saving…" : "Save confirmation"}
          </Button>
          <Button asChild variant="outline">
            <a href={clientWa} target="_blank" rel="noreferrer">
              <MessageCircle /> WhatsApp client
            </a>
          </Button>
        </div>
      </section>

      <VersionHistory
        key={`${booking.id}-${historyTick}`}
        intakeId={booking.id}
        onRestored={() => {
          getIntake({ data: Number(id) }).then((row) => {
            if (!row) return;
            setRecord(row);
            setNotes(row.therapistNotes);
            setTransport(String(row.transportFee));
            setDeposit(row.depositReceived);
          });
        }}
      />
    </main>
  );
}

function VersionHistory({ intakeId, onRestored }: { intakeId: number; onRestored: () => void }) {
  const [rows, setRows] = useState<RevisionSummary[] | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listRevisions({ data: intakeId })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [intakeId]);

  async function restore(revisionId: number) {
    setBusy(true);
    try {
      await restoreRevision({ data: { intakeId, revisionId } });
      const data = await listRevisions({ data: intakeId });
      setRows(data);
      setPendingId(null);
      toast.success("Rolled back to that version");
      onRestored();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not restore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 mb-12 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
        Version history
      </h2>
      <p className="mt-2 text-sm text-muted">
        Every save is kept. Restore if a note, fee, or status was changed by mistake.
      </p>
      {rows === null ? (
        <div className="mt-4 h-16 animate-pulse rounded-lg bg-surface-2" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-subtle">No versions yet — the next save creates the first one.</p>
      ) : (
        <ol className="mt-4 divide-y divide-border">
          {rows.map((row, index) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {row.summary || row.reason}
                  {index === 0 ? " · latest" : ""}
                </p>
                <p className="mt-0.5 text-xs text-subtle">{formatDateTime(row.createdAt)}</p>
              </div>
              {index === 0 ? null : pendingId === row.id ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void restore(row.id)}>
                    {busy ? "Restoring…" : "Restore this"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setPendingId(row.id)}>
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  mint,
}: {
  label: string;
  value: string;
  mint?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 py-3 sm:grid-cols-[220px_1fr]",
        mint && "rounded-md bg-mint px-3",
      )}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
