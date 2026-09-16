import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { attachStudioFile, deleteIntakeFile, listIntakeFiles, type IntakeFile } from "@/lib/files";
import {
  STUDIO_FILE_CAP,
  STUDIO_KINDS,
  fileKindLabel,
  fileToPending,
  type PendingFile,
} from "@/lib/image";
import { cn, formatDateTime } from "@/lib/utils";

export function PhotoSlots({
  kinds,
  value,
  onChange,
  cap,
}: {
  kinds: readonly { id: string; label: string }[];
  value: PendingFile[];
  onChange: (next: PendingFile[]) => void;
  cap: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(list: FileList | null) {
    const file = list?.[0];
    const kind = picking;
    setPicking(null);
    if (inputRef.current) inputRef.current.value = "";
    if (!file || !kind) return;
    setBusy(true);
    try {
      const pending = await fileToPending(file, kind);
      const without = value.filter((item) => item.kind !== kind);
      const next = [...without, pending].slice(0, cap);
      onChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void onPick(event.target.files)}
      />
      {kinds.map((kind) => {
        const current = value.find((item) => item.kind === kind.id);
        return (
          <div key={kind.id} className="overflow-hidden rounded-xl border border-border bg-surface">
            {current ? (
              <div className="relative">
                <img src={current.preview} alt={kind.label} className="h-40 w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-ink text-primary-fg"
                  onClick={() => onChange(value.filter((item) => item.kind !== kind.id))}
                  aria-label={`Remove ${kind.label}`}
                >
                  <X className="size-4" />
                </button>
                <p className="px-3 py-2 text-sm text-ink">{kind.label}</p>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || value.length >= cap}
                onClick={() => {
                  setPicking(kind.id);
                  inputRef.current?.click();
                }}
                className={cn(
                  "flex min-h-40 w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center",
                  "text-sm text-muted hover:bg-surface-2 disabled:opacity-50",
                )}
              >
                <ImagePlus className="size-6 text-primary" />
                <span className="font-medium text-ink">{kind.label}</span>
                <span>JPEG, PNG or WebP · optional</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BookingPhotos({ intakeId }: { intakeId: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<IntakeFile[] | null>(null);
  const [kind, setKind] = useState<(typeof STUDIO_KINDS)[number]["id"]>("photo");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function reload() {
    const data = await listIntakeFiles({ data: intakeId });
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    listIntakeFiles({ data: intakeId })
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

  async function onPick(list: FileList | null) {
    const file = list?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const pending = await fileToPending(file, kind);
      await attachStudioFile({
        data: {
          intakeId,
          kind: pending.kind,
          filename: pending.filename,
          mime: "image/jpeg",
          data: pending.data,
        },
      });
      await reload();
      toast.success("Photo saved to this booking");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that photo");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await deleteIntakeFile({ data: id });
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted">Photos</h2>
      <p className="mt-2 text-sm text-muted">
        Client uploads and anything you add stay on this card. Vault snapshots restore the form, not the pictures.
      </p>

      {rows === null ? (
        <div className="mt-4 h-28 animate-pulse rounded-lg bg-surface-2" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-subtle">No photos yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((file) => (
            <li key={file.id} className="overflow-hidden rounded-lg border border-border bg-bg">
              <button type="button" className="block w-full text-left" onClick={() => setOpen(file.preview)}>
                <img src={file.preview} alt={fileKindLabel(file.kind)} className="h-28 w-full object-cover" />
              </button>
              <div className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">{fileKindLabel(file.kind)}</p>
                  <p className="truncate text-xs text-subtle">
                    {file.uploadedBy === "client" ? "Client" : "Studio"} · {formatDateTime(file.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
                  onClick={() => void remove(file.id)}
                  aria-label="Remove photo"
                  disabled={busy}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {STUDIO_KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKind(item.id)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm",
              kind === item.id ? "border-ink bg-ink text-primary-fg" : "border-border bg-bg hover:bg-surface-2",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void onPick(event.target.files)}
      />
      <Button
        className="mt-4"
        variant="outline"
        disabled={busy || (rows !== null && rows.length >= STUDIO_FILE_CAP)}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus />
        {busy ? "Saving…" : "Add a photo"}
      </Button>

      {open ? (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-0 z-50 grid place-items-center bg-ink/80 p-6"
          onClick={() => setOpen(null)}
        >
          <img src={open} alt="" className="max-h-full max-w-full rounded-lg" />
        </button>
      ) : null}
    </section>
  );
}
