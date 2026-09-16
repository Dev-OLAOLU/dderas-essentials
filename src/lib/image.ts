export const IMAGE_MAX_EDGE = 1400;
export const IMAGE_MAX_BYTES = 1_200_000;
export const CLIENT_FILE_CAP = 2;
export const STUDIO_FILE_CAP = 8;

export const CLIENT_KINDS = [
  { id: "entrance", label: "Entrance / gate" },
  { id: "deposit", label: "Deposit screenshot" },
] as const;

export const STUDIO_KINDS = [
  { id: "consent", label: "Signed consent" },
  { id: "photo", label: "Session photo" },
  { id: "deposit", label: "Deposit screenshot" },
  { id: "other", label: "Other" },
] as const;

export type FileKindId = (typeof CLIENT_KINDS)[number]["id"] | (typeof STUDIO_KINDS)[number]["id"];

export function fileKindLabel(kind: string): string {
  const hit =
    CLIENT_KINDS.find((item) => item.id === kind) ?? STUDIO_KINDS.find((item) => item.id === kind);
  return hit?.label ?? kind;
}

export type PendingFile = {
  kind: string;
  filename: string;
  mime: string;
  data: string;
  bytes: number;
  preview: string;
};

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function basename(name: string): string {
  const trimmed = name.trim().replace(/[/\\]/g, "");
  const cut = trimmed.slice(0, 80);
  return cut || "photo.jpg";
}

export async function fileToPending(file: File, kind: string): Promise<PendingFile> {
  const mime = file.type.toLowerCase();
  if (!ALLOWED.has(mime) && !mime.startsWith("image/")) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Could not compress that photo."))),
      "image/jpeg",
      0.82,
    );
  });
  if (blob.size > IMAGE_MAX_BYTES) {
    throw new Error("That photo is still too large. Try a closer crop.");
  }

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const data = btoa(binary);
  const outMime = "image/jpeg";
  return {
    kind,
    filename: basename(file.name).replace(/\.[a-z0-9]+$/i, ".jpg"),
    mime: outMime,
    data,
    bytes: blob.size,
    preview: `data:${outMime};base64,${data}`,
  };
}
