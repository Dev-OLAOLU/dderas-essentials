import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BrandMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { STUDIO } from "@/lib/intake-schema";
import { getAmbassadorGate } from "@/lib/studio";
import { AMBASSADOR_SEATS } from "@/lib/cycle";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState<{ filled: number; cap: number; open: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAmbassadorGate()
      .then((value) => {
        if (!cancelled) setGate(value);
      })
      .catch(() => {
        if (!cancelled) setGate({ filled: AMBASSADOR_SEATS, cap: AMBASSADOR_SEATS, open: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg">
        <div className="h-10 w-40 animate-pulse rounded-full bg-surface-2" />
      </main>
    );
  }
  if (user) return <Navigate to="/studio" />;

  const seatsOpen = gate?.open ?? false;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        if (!seatsOpen) {
          throw new Error("New accounts are closed. Sign in with an existing profile.");
        }
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim() || "Ambassador",
          email,
          password,
        });
        if (signUpError) throw new Error(signUpError.message ?? "Could not create account");
      } else {
        const { error: signInError } = await authClient.signIn.email({ email, password });
        if (signInError) throw new Error(signInError.message ?? "Could not sign in");
      }
      window.location.href = "/studio";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-12 text-ink">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <BrandMark className="size-10" />
          <span>
            <span className="block font-display text-xl tracking-tight">{STUDIO.name}</span>
            <span className="text-xs uppercase tracking-[0.16em] text-muted">Ambassador access</span>
          </span>
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Use your studio email and password.</p>

        {authEnabled ? (
          <div className="mt-8 grid gap-3">
            {GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                type="button"
                variant="outline"
                onClick={() => void signIn(provider.providerId, { callbackURL: "/studio" })}
              >
                Continue with {provider.label}
              </Button>
            ))}
            <div className="relative my-2 text-center text-xs uppercase tracking-[0.16em] text-subtle">
              <span className="relative z-10 bg-bg px-3">or email</span>
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>
            <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
              {mode === "up" && seatsOpen ? (
                <Field label="Your name">
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
              ) : null}
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </Field>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" variant="secondary" disabled={busy}>
                {busy ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
              </Button>
            </form>
            {seatsOpen ? (
              <button
                type="button"
                className="text-sm text-muted hover:text-ink"
                onClick={() => {
                  setMode((current) => (current === "in" ? "up" : "in"));
                  setError(null);
                }}
              >
                {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
