import { BODY_AREAS } from "@/lib/intake-schema";
import { cn } from "@/lib/utils";

type Region = {
  id: string;
  d: string;
};

const REGIONS: Region[] = [
  { id: "head", d: "M86 18c12 0 20 10 20 22 0 10-6 18-20 18S66 50 66 40c0-12 8-22 20-22Z" },
  { id: "neck", d: "M76 56h20v16H76Z" },
  { id: "shoulders", d: "M38 70c8-6 20-8 48-8s40 2 48 8l-10 16c-8-4-22-6-38-6s-30 2-38 6Z" },
  { id: "chest", d: "M62 86h48v40H62Z" },
  { id: "upper-back", d: "M64 86h44v28H64Z" },
  { id: "lower-back", d: "M66 114h40v30H66Z" },
  { id: "arms", d: "M28 78c-8 18-12 40-12 58 0 6 4 10 10 10 5 0 8-4 9-10 2-16 6-34 12-48Zm116 0c8 18 12 40 12 58 0 6-4 10-10 10-5 0-8-4-9-10-2-16-6-34-12-48Z" },
  { id: "hips", d: "M64 142h44v22H64Z" },
  { id: "legs", d: "M66 162h18v70H66Zm22 0h18v70H88Z" },
  { id: "feet", d: "M62 230h24v16H62Zm24 0h24v16H86Z" },
];

const BACK_ONLY = new Set(["upper-back", "lower-back"]);
const FRONT_ONLY = new Set(["chest"]);

export function BodyMap({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = new Set(value);

  function toggle(id: string) {
    if (id === "full-body") {
      onChange(selected.has("full-body") ? [] : ["full-body"]);
      return;
    }
    const next = new Set(selected);
    next.delete("full-body");
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr] md:items-start">
      <div className="mx-auto w-full max-w-[220px] rounded-xl bg-surface-2/60 p-3">
        <svg viewBox="0 0 172 260" className="h-auto w-full text-primary" role="img" aria-label="Body focus map">
          <path
            d="M86 16c14 0 24 12 24 26 0 9-5 16-12 20v8h20c14 0 26 6 32 16l6 44c2 12-2 18-10 20l-4 8c6 14 10 32 10 48 0 10-6 16-14 16s-12-6-13-16l-7-50H80l-7 50c-1 10-5 16-13 16s-14-6-14-16c0-16 4-34 10-48l-4-8c-8-2-12-8-10-20l6-44c6-10 18-16 32-16h20v-8c-7-4-12-11-12-20 0-14 10-26 24-26Z"
            fill="currentColor"
            opacity="0.08"
          />
          {REGIONS.filter((region) => !BACK_ONLY.has(region.id) || true).map((region) => {
            const on = selected.has(region.id) || selected.has("full-body");
            const isBack = BACK_ONLY.has(region.id);
            const isFront = FRONT_ONLY.has(region.id);
            return (
              <path
                key={region.id}
                d={region.d}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={region.id}
                onClick={() => toggle(region.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(region.id);
                  }
                }}
                className={cn(
                  "cursor-pointer transition-colors duration-150",
                  on ? "fill-primary/55 stroke-primary" : "fill-surface stroke-primary/40 hover:fill-primary/20",
                )}
                strokeWidth={isBack || isFront ? 1.2 : 1.2}
              />
            );
          })}
        </svg>
        <p className="mt-2 text-center text-xs text-muted">Tap a region to focus there</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {BODY_AREAS.map((area) => {
          const on = selected.has(area.id);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggle(area.id)}
              className={cn(
                "h-11 rounded-full border px-4 text-sm transition-colors duration-150",
                on
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-surface text-ink hover:bg-surface-2",
              )}
            >
              {area.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
