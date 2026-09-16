import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Shield, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createBackup,
  downloadBackup,
  importBackup,
  listBackups,
  restoreBackup,
  type BackupKind,
  type BackupSummary,
} from "@/lib/vault";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const Route = createFileRoute("/studio/vault")({ component: StudioVaultPage });

const KIND_LABEL: Record<BackupKind, string> = {
  manual: "Saved by you",
  auto: "Automatic",
  safety: "Safety copy",
  import: "Imported file",
};

function downloadDocument(label: string, document: unknown) {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const node = window.document.createElement("a");
  node.href = href;
  node.download = `ddera-essentials-${stamp}.json`;
  window.document.body.appendChild(node);
  node.click();
  node.remove();
  URL.revokeObjectURL(href);
  toast.success(`Downloaded ${label}`);
}

function StudioVaultPage() {
  const [rows, setRows] = useState<BackupSummary[] | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [busy, setBusy] = useState<"save" | "restore" | "import" | number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const data = await listBackups();
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    listBackups()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "Could not open the vault");
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveNow() {
    setBusy("save");
    try {
      await createBackup({ data: {} });
      await reload();
      toast.success("Snapshot saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save snapshot");
    } finally {
      setBusy(null);
    }
  }

  async function onDownload(id: number) {
    setBusy(id);
    try {
      const file = await downloadBackup({ data: id });
      downloadDocument(file.label, file.document);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download");
    } finally {
      setBusy(null);
    }
  }

  async function onRestore(id: number) {
    setBusy("restore");
    try {
      const result = await restoreBackup({ data: id });
      setPendingId(null);
      await reload();
      toast.success(
        `Restored ${result.restored} booking${result.restored === 1 ? "" : "s"}. A safety copy was kept.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  }

  async function onImport(file: File) {
    setBusy("import");
    try {
      const raw = await file.text();
      const result = await importBackup({ data: { raw, label: file.name.slice(0, 80) } });
      await reload();
      toast.success(`Imported and restored ${result.restored} booking${result.restored === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import that file");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Studio</p>
      <h1 className="mt-1 font-display text-4xl tracking-tight">Vault</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Snapshots of every client booking. Restore if a note is overwritten, or keep a copy
        on your phone. Photos live on each booking card — snapshots restore the form, not the pictures.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-5">
          <Shield className="size-5 text-primary" />
          <h2 className="mt-3 font-medium">Save a snapshot</h2>
          <p className="mt-1 text-sm text-muted">
            Freeze the live book as it is now. One is also taken automatically each day you open Studio.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            disabled={busy === "save"}
            onClick={() => void saveNow()}
          >
            {busy === "save" ? "Saving…" : "Save snapshot now"}
          </Button>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <Download className="size-5 text-primary" />
          <h2 className="mt-3 font-medium">Keep a copy</h2>
          <p className="mt-1 text-sm text-muted">
            Download a JSON file you can email to yourself. That copy survives even if this app is reset.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <Upload className="size-5 text-primary" />
          <h2 className="mt-3 font-medium">Bring a copy back</h2>
          <p className="mt-1 text-sm text-muted">
            Import a downloaded file. Live bookings are replaced, and a safety copy is kept first.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
            }}
          />
          <Button
            className="mt-4"
            variant="outline"
            disabled={busy === "import"}
            onClick={() => fileRef.current?.click()}
          >
            {busy === "import" ? "Importing…" : "Import a file"}
          </Button>
        </article>
      </div>

      <h2 className="mt-12 font-display text-3xl tracking-tight">Snapshots</h2>

      {rows === null ? (
        <div className="mt-6 grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-2xl">No snapshots yet</p>
          <p className="mt-2 text-sm text-muted">Save one now so the first bad edit isn’t the last copy.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => {
            const confirm = pendingId === row.id;
            return (
              <li key={row.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDateTime(row.createdAt)} · {row.intakeCount} booking
                      {row.intakeCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge tone={row.kind === "safety" ? "warn" : row.kind === "manual" ? "primary" : "muted"}>
                    {KIND_LABEL[row.kind]}
                  </Badge>
                </div>
                {confirm ? (
                  <div className="mt-4 rounded-lg bg-bg px-4 py-3">
                    <p className="text-sm text-ink">
                      Replace the live book with this snapshot? A safety copy of what’s live now is saved first.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={busy === "restore"}
                        onClick={() => void onRestore(row.id)}
                      >
                        <RotateCcw />
                        {busy === "restore" ? "Restoring…" : "Yes, restore this"}
                      </Button>
                      <Button variant="outline" onClick={() => setPendingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => void onDownload(row.id)}
                    >
                      <Download /> Download
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingId(row.id)}>
                      <RotateCcw /> Restore
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
