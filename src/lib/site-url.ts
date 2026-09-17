function read(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

function withHttps(host: string): string {
  if (/^https?:\/\//i.test(host)) return host;
  return `https://${host}`;
}

export function sanitizeOrigin(value?: string | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(withHttps(raw));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** Public site origin for quote links in email / WhatsApp. */
export function publicSiteOrigin(fallback?: string): string {
  const production = read("VERCEL_PROJECT_PRODUCTION_URL");
  const vercel = read("VERCEL_URL");
  const candidates = [
    read("BETTER_AUTH_URL"),
    production ? withHttps(production) : undefined,
    vercel ? withHttps(vercel) : undefined,
    fallback,
  ];
  for (const candidate of candidates) {
    const origin = sanitizeOrigin(candidate);
    if (origin) return origin;
  }
  return "";
}

export function quotePageUrl(origin: string, reference: string, token: string): string {
  if (!origin || !token) return "";
  return `${origin}/visit/${encodeURIComponent(reference)}?k=${encodeURIComponent(token)}`;
}
