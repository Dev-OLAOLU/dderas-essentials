import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Home, Mail, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SessionStarter } from "@/components/session-starter";
import { Button } from "@/components/ui/button";
import {
  ASMR_SERVICE,
  CORE_SERVICES,
  EXTRAS,
  STUDIO,
  naira,
} from "@/lib/intake-schema";

export const Route = createFileRoute("/")({ component: HomePage });

const STEPS = [
  {
    n: "1",
    title: "Choose a session",
    body: "Pick a therapy and length. The price updates as you tap.",
  },
  {
    n: "2",
    title: "Tell us where to come",
    body: "Address, preferred time, and a short health note.",
  },
  {
    n: "3",
    title: "D-Dera confirms",
    body: "She messages you on WhatsApp with travel and a start time.",
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader tone="flush" />
      <main>
        <section className="relative overflow-hidden px-5 pb-14 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
          <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-8">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                <Home className="size-3.5" />
                Home visits only · Lagos
              </p>
              <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
                Massage
                <br />
                at your home.
              </h1>
              <p className="mt-4 max-w-md text-lg text-muted">
                Pick a therapy, see the price, send a short intake. D-Dera confirms on WhatsApp and comes to you.
              </p>
            </div>
            <div className="lg:col-start-2 lg:row-span-2">
              <SessionStarter />
            </div>
            <ol className="grid gap-4">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-lg text-ink">
                    {step.n}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{step.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{step.body}</span>
                  </span>
                </li>
              ))}
              <li className="flex gap-4">
                <span className="size-9 shrink-0" aria-hidden="true" />
                <a
                  href="#menu"
                  className="inline-flex h-11 items-center text-sm font-medium text-muted hover:text-ink"
                >
                  Or browse the full menu
                </a>
              </li>
            </ol>
          </div>
        </section>

        <section id="menu" className="border-t border-border bg-surface px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Core massage therapies
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-tight">The menu</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Tap a duration to start booking that session.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {CORE_SERVICES.map((service) => (
                <article
                  key={service.id}
                  className="flex flex-col rounded-xl border border-border bg-bg p-5"
                >
                  <h3 className="font-display text-2xl tracking-tight">{service.label}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{service.blurb}</p>
                  <ul className="mt-5 grid gap-2">
                    {Object.entries(service.prices).map(([minutes, price]) => (
                      <li key={minutes}>
                        <Link
                          to="/book"
                          search={{ service: service.id, mins: Number(minutes) }}
                          className="flex min-h-11 items-center justify-between rounded-md px-2 text-sm hover:bg-surface-2"
                        >
                          <span className="text-muted">{minutes} mins</span>
                          <span className="inline-flex items-center gap-2 tabular-nums font-medium">
                            {naira(Number(price))}
                            <ArrowRight className="size-3.5 text-subtle" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-14 text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Therapy extras
            </p>
            <p className="mt-2 text-sm text-muted">
              Add these in the builder — they must sit with a core therapy.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {EXTRAS.map((extra) => (
                <article
                  key={extra.id}
                  className="rounded-xl border border-border bg-bg p-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium">{extra.label}</h3>
                    <p className="text-sm tabular-nums text-muted">
                      {extra.minutes} mins · {naira(extra.price)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted">{extra.blurb}</p>
                </article>
              ))}
            </div>

            <div className="mt-14 rounded-xl border border-border bg-ink px-6 py-8 text-primary-fg sm:px-10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary-fg/60">
                ASMR services
              </p>
              <h3 className="mt-2 font-display text-3xl tracking-tight">
                {ASMR_SERVICE.label}
              </h3>
              <p className="mt-3 max-w-2xl text-sm text-primary-fg/75">
                {ASMR_SERVICE.blurb}
              </p>
              <ul className="mt-6 flex flex-wrap gap-3">
                {Object.entries(ASMR_SERVICE.prices).map(([minutes, price]) => (
                  <li key={minutes}>
                    <Link
                      to="/book"
                      search={{ service: ASMR_SERVICE.id, mins: Number(minutes) }}
                      className="inline-flex h-11 items-center rounded-full bg-primary-fg/10 px-4 text-sm hover:bg-primary-fg/20"
                    >
                      {minutes} mins · {naira(Number(price))}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 flex justify-center">
              <Button asChild variant="secondary" size="lg">
                <Link to="/book">
                  Start booking <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-xl">For bookings & enquiries</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted">
              <a
                className="inline-flex items-center gap-2 hover:text-ink"
                href={`mailto:${STUDIO.email}`}
              >
                <Mail className="size-4" />
                {STUDIO.email}
              </a>
              <a
                className="inline-flex items-center gap-2 hover:text-ink"
                href={`https://wa.me/${STUDIO.whatsappE164}`}
              >
                <MessageCircle className="size-4" />
                WhatsApp {STUDIO.whatsappDisplay}
              </a>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-xs uppercase tracking-[0.16em] text-subtle">
              Home services only
            </p>
            <Link
              to="/login"
              className="text-xs uppercase tracking-[0.16em] text-subtle hover:text-muted"
            >
              Ambassador studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
