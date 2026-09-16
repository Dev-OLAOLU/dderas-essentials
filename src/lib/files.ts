import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { CLIENT_FILE_CAP, CLIENT_KINDS, IMAGE_MAX_BYTES, STUDIO_FILE_CAP, STUDIO_KINDS } from "@/lib/image";
import { assertAmbassador } from "@/lib/studio";

const KIND_SET = new Set<string>([
  ...CLIENT_KINDS.map((item) => item.id),
  ...STUDIO_KINDS.map((item) => item.id),
]);

export type IntakeFile = {
  id: number;
  intakeId: number;
  kind: string;
  filename: string;
  mime: string;
  bytes: number;
  uploadedBy: string;
  createdAt: string;
  preview: string;
};

const payloadSchema = z.object({
  intakeId: z.number().int().positive(),
  kind: z.string().min(1).max(32),
  filename: z.string().trim().min(1).max(80),
  mime: z.literal("image/jpeg"),
  data: z.string().min(32).max(1_800_000),
});

function decodeSize(data: string): number {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

function toFile(row: {
  id: number;
  intake_id: number;
  kind: string;
  filename: string;
  mime: string;
  bytes: number;
  uploaded_by: string;
  created_at: string;
  data: string;
}): IntakeFile {
  return {
    id: row.id,
    intakeId: row.intake_id,
    kind: row.kind,
    filename: row.filename,
    mime: row.mime,
    bytes: Number(row.bytes),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    preview: `data:${row.mime};base64,${row.data}`,
  };
}

export const attachClientFile = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    payloadSchema.extend({ reference: z.string().min(4).max(16) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!KIND_SET.has(data.kind) || !CLIENT_KINDS.some((item) => item.id === data.kind)) {
      throw new Error("That photo type is not used on the intake.");
    }
    const bytes = decodeSize(data.data);
    if (bytes > IMAGE_MAX_BYTES) throw new Error("That photo is too large.");
    const sql = await getSql();
    const rows = await sql<{ id: number; created_at: string }>`
      select id, created_at from intakes
      where id = ${data.intakeId} and reference = ${data.reference}
      limit 1
    `;
    const intake = rows[0];
    if (!intake) throw new Error("Booking not found.");
    const age = Date.now() - new Date(intake.created_at).getTime();
    if (!Number.isFinite(age) || age > 30 * 60 * 1000) {
      throw new Error("Photos need to be added right after you send the form.");
    }
    const counted = await sql<{ n: number }>`
      select count(*)::int as n from intake_files
      where intake_id = ${data.intakeId} and uploaded_by = ${"client"}
    `;
    if (Number(counted[0]?.n ?? 0) >= CLIENT_FILE_CAP) {
      throw new Error("You can attach two photos on the form.");
    }
    await sql`
      insert into intake_files (intake_id, kind, filename, mime, bytes, data, uploaded_by)
      values (
        ${data.intakeId},
        ${data.kind},
        ${data.filename},
        ${data.mime},
        ${bytes},
        ${data.data},
        ${"client"}
      )
    `;
    return { ok: true as const };
  });

export const listIntakeFiles = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      intake_id: number;
      kind: string;
      filename: string;
      mime: string;
      bytes: number;
      uploaded_by: string;
      created_at: string;
      data: string;
    }>`
      select id, intake_id, kind, filename, mime, bytes, uploaded_by, created_at, data
      from intake_files
      where intake_id = ${id}
      order by created_at desc
    `;
    return rows.map(toFile);
  });

export const attachStudioFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAmbassador(context.userId);
    if (!KIND_SET.has(data.kind)) throw new Error("Choose what this photo is.");
    const bytes = decodeSize(data.data);
    if (bytes > IMAGE_MAX_BYTES) throw new Error("That photo is too large.");
    const sql = await getSql();
    const exists = await sql<{ id: number }>`
      select id from intakes where id = ${data.intakeId} limit 1
    `;
    if (!exists[0]) throw new Error("Booking not found.");
    const counted = await sql<{ n: number }>`
      select count(*)::int as n from intake_files where intake_id = ${data.intakeId}
    `;
    if (Number(counted[0]?.n ?? 0) >= STUDIO_FILE_CAP) {
      throw new Error("This booking already has the maximum number of photos.");
    }
    await sql`
      insert into intake_files (intake_id, kind, filename, mime, bytes, data, uploaded_by)
      values (
        ${data.intakeId},
        ${data.kind},
        ${data.filename},
        ${data.mime},
        ${bytes},
        ${data.data},
        ${context.userId}
      )
    `;
    return { ok: true as const };
  });

export const deleteIntakeFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    await sql`delete from intake_files where id = ${id}`;
    return { ok: true as const };
  });
