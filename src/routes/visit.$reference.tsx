import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { choosePayment, getPublicVisit } from "@/lib/intakes";
import {
  PAYMENT_CHOICES,
  STUDIO,
  amountDue,
  extraLabel,
  naira,
  paymentChoiceLabel,
  serviceLabel,
  type PaymentChoice,
} from "@/lib/intake-schema";
import { cn, formatDisplayDate, formatTimeLabel, whatsappHref } from "@/lib/utils";

type VisitQuote = Awaited<ReturnType<typeof getPublicVisit>>;

export const Route = createFileRoute("/visit/$reference")({
  validateSearch: (search: Record<string, unknown>): { k: string } => ({
    k: typeof search.k === "string" ? search.k : "",
  }),
  component: VisitQuotePage,
});

function VisitQuotePage() {
  const { reference } = Route.useParams();
  const { k } = Route.useSearch();
  const [visit, setVisit] = useState<VisitQuote | null | undefined>(undefined);
  const [picked, setPicked] = useState<PaymentChoice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!k) {
      setVisit(null);
      return;
    }
    getPublicVisit({ data: { reference, token: k } })
      .then((row) => {
        if (!cancelled) {
          setVisit(row);
          setPicked(row.paymentChoice);
        }
      })
      .catch(() => {
        if (!cancelled) setVisit(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reference, k]);

  if (visit === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-5">
        <div className="h-40 w-full max-w-md animate-pulse rounded-xl bg-surface-2" />
      </main>
    );
  }

  if (!visit) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16 text-center">
        <BrandMark className="mx-auto size-12" />
        <h1 className="mt-6 font-display text-3xl tracking-tight">Link not valid</h1>
        <p className="mt-3 text-muted">
          Use the quote link from your booking confirmation, or message D-Dera on WhatsApp.
        </p>
        <Button asChild className="mt-8" variant="secondary">
          <a href={whatsappHref(STUDIO.whatsappE164, `Hi D-Dera, I need help with booking ${reference}.`)}>
            <MessageCircle /> WhatsApp D-Dera
          </a>
        </Button>
      </main>
    );
  }

  const extras = visit.extras.map(extraLabel).filter(Boolean);
  const chosen = visit.paymentChoice;
  const waiting = !visit.quoted;
  const locked = Boolean(chosen);
  const quote = visit;

  async function confirm() {
    if (!picked) {
      toast.error("Choose how you want to pay");
      return;
    }
    setSaving(true);
    try {
      await choosePayment({ data: { reference: quote.reference, token: k, choice: picked } });
      setVisit({ ...quote, paymentChoice: picked, status: "confirmed" });
      toast.success("Choice saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that choice");
    } finally {
      setSaving(false);
    }
  }

  const due = picked
    ? amountDue(picked, {
        serviceFee: visit.serviceFee,
        extrasFee: visit.extrasFee,
        transportFee: visit.transportFee,
      })
    : null;

  const waText = chosen
    ? `Hi D-Dera, this is ${visit.firstName}. I choose to ${paymentChoiceLabel(chosen).toLowerCase()} for ${visit.reference} — ${naira(amountDue(chosen, visit))}.`
    : `Hi D-Dera, this is ${visit.firstName}. Checking my quote for ${visit.reference}.`;

  return (
    <main className="min-h-screen bg-bg px-5 py-10 text-ink sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <span>
            <span className="block font-display text-xl tracking-tight">{STUDIO.name}</span>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">{visit.reference}</span>
          </span>
        </Link>

        <h1 className="mt-8 font-display text-4xl tracking-tight">
          {waiting ? `Hang tight, ${visit.firstName}.` : `Your quote, ${visit.firstName}.`}
        </h1>
        <p className="mt-3 text-muted">
          {waiting
            ? "D-Dera has your request. She’ll add transport and send this page live for you to choose how to pay."
            : locked
              ? "Your payment choice is with the studio. Finish on WhatsApp."
              : "Choose how you want to pay. D-Dera confirms the transfer on WhatsApp."}
        </p>

        <section className="mt-8 rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Visit</p>
          <p className="mt-2 font-medium">
            {serviceLabel(visit.serviceType)} · {visit.durationMinutes} mins
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatDisplayDate(visit.preferredDate)} · {formatTimeLabel(visit.preferredTime)}
          </p>
          {extras.length ? (
            <p className="mt-3 text-sm text-muted">Extras: {extras.join(", ")}</p>
          ) : null}
          <dl className="mt-5 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Session</dt>
              <dd>{naira(visit.serviceFee)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Extras</dt>
              <dd>{naira(visit.extrasFee)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Transport</dt>
              <dd>{waiting ? "To be confirmed" : naira(visit.transportFee)}</dd>
            </div>
          </dl>
        </section>

        {waiting ? (
          <p className="mt-6 text-sm text-muted">
            Bookmark this page. When the fare is in, both payment options appear here.
          </p>
        ) : (
          <div className="mt-6 grid gap-3">
            {PAYMENT_CHOICES.map((option) => {
              const amount = amountDue(option.id, visit);
              const on = picked === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setPicked(option.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left",
                    on ? "border-ink bg-ink text-primary-fg" : "border-border bg-surface hover:bg-surface-2",
                    locked && !on ? "opacity-50" : "",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium">{option.label}</span>
                    <span className="tabular-nums">{naira(amount)}</span>
                  </span>
                  <span className={cn("mt-1 block text-sm", on ? "text-primary-fg/80" : "text-muted")}>
                    {option.hint}
                  </span>
                </button>
              );
            })}
            {!locked ? (
              <Button
                className="mt-2"
                variant="secondary"
                disabled={saving || !picked}
                onClick={() => void confirm()}
              >
                {saving ? "Saving…" : due ? `Confirm ${naira(due)}` : "Confirm choice"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
                <Check className="size-4 text-primary" />
                {paymentChoiceLabel(chosen)} · {naira(amountDue(chosen ?? "full", visit))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild variant={locked ? "secondary" : "outline"}>
            <a href={whatsappHref(STUDIO.whatsappE164, waText)}>
              <MessageCircle /> WhatsApp D-Dera
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
