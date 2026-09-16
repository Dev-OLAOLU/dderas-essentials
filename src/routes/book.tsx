import { createFileRoute } from "@tanstack/react-router";
import { IntakeWizard } from "@/components/intake-wizard";
import { SiteHeader } from "@/components/site-header";

export type BookSearch = {
  service?: string;
  mins?: number;
  extras?: string;
};

export const Route = createFileRoute("/book")({
  validateSearch: (raw: Record<string, unknown>): BookSearch => {
    const minsRaw = raw.mins;
    const mins =
      typeof minsRaw === "number"
        ? minsRaw
        : typeof minsRaw === "string"
          ? Number(minsRaw)
          : undefined;
    return {
      service: typeof raw.service === "string" ? raw.service : undefined,
      mins: mins && Number.isFinite(mins) ? mins : undefined,
      extras: typeof raw.extras === "string" ? raw.extras : undefined,
    };
  },
  component: BookPage,
});

function BookPage() {
  const search = Route.useSearch();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader />
      <IntakeWizard preset={search} />
    </div>
  );
}
