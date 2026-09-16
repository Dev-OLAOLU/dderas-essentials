import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { STUDIO } from "@/lib/intake-schema";
import { assertAmbassador } from "@/lib/studio";

export type BackupKind = "manual" | "auto" | "safety" | "import";

export type BackupSummary = {
  id: number;
  label: string;
  kind: BackupKind;
  intakeCount: number;
  createdBy: string | null;
  createdAt: string;
};

export type StoredIntake = {
  id: number;
  reference: string;
  full_name: string;
  phone: string;
  address_exact: string;
  service_area: string;
  preferred_date: string;
  preferred_time: string;
  service_type: string;
  duration_minutes: number;
  extras: string;
  service_fee: number;
  extras_fee: number;
  transport_fee: number;
  grand_total: number;
  injuries_flag: boolean;
  injuries_detail: string;
  allergies: string;
  areas_of_focus: string;
  pressure: string;
  consent_name: string;
  consent_at: string;
  status: string;
  deposit_received: boolean;
  therapist_notes: string;
  updated_by: string | null;
  created_at: string;
  completed_at: string | null;
};

export type BackupDocument = {
  version: 1;
  studio: string;
  exportedAt: string;
  intakes: StoredIntake[];
};

export type RevisionSummary = {
  id: number;
  intakeId: number;
  reference: string;
  reason: string;
  summary: string;
  createdBy: string | null;
  createdAt: string;
};

type BackupRow = {
  id: number;
  label: string;
  kind: string;
  intake_count: number;
  payload: string;
  created_by: string | null;
  created_at: string;
};

type RevisionRow = {
  id: number;
  intake_id: number;
  reference: string;
  snapshot: string;
  reason: string;
  summary: string;
  created_by: string | null;
  created_at: string;
};

function asText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function asInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function toStored(row: Record<string, unknown>): StoredIntake {
  return {
    id: asInt(row.id),
    reference: asText(row.reference),
    full_name: asText(row.full_name ?? row.fullName),
    phone: asText(row.phone),
    address_exact: asText(row.address_exact ?? row.addressExact),
    service_area: asText(row.service_area ?? row.serviceArea),
    preferred_date: asText(row.preferred_date ?? row.preferredDate),
    preferred_time: asText(row.preferred_time ?? row.preferredTime),
    service_type: asText(row.service_type ?? row.serviceType),
    duration_minutes: asInt(row.duration_minutes ?? row.durationMinutes, 60),
    extras: asText(row.extras, "[]"),
    service_fee: asInt(row.service_fee ?? row.serviceFee),
    extras_fee: asInt(row.extras_fee ?? row.extrasFee),
    transport_fee: asInt(row.transport_fee ?? row.transportFee),
    grand_total: asInt(row.grand_total ?? row.grandTotal),
    injuries_flag: asBool(row.injuries_flag ?? row.injuriesFlag),
    injuries_detail: asText(row.injuries_detail ?? row.injuriesDetail),
    allergies: asText(row.allergies),
    areas_of_focus: asText(row.areas_of_focus ?? row.areasOfFocus, "[]"),
    pressure: asText(row.pressure, "medium"),
    consent_name: asText(row.consent_name ?? row.consentName),
    consent_at: asText(row.consent_at ?? row.consentAt) || new Date().toISOString(),
    status: asText(row.status, "new"),
    deposit_received: asBool(row.deposit_received ?? row.depositReceived),
    therapist_notes: asText(row.therapist_notes ?? row.therapistNotes),
    updated_by: row.updated_by == null ? null : asText(row.updated_by),
    created_at: asText(row.created_at ?? row.createdAt) || new Date().toISOString(),
    completed_at: row.completed_at ? asText(row.completed_at) : null,
  };
}

function parseDocument(raw: string): BackupDocument {
  const value = JSON.parse(raw) as unknown;
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { intakes?: unknown }).intakes)
      ? (value as { intakes: unknown[] }).intakes
      : null;
  if (!rows) throw new Error("This file is not a D-Dera vault export.");
  const studio =
    value && typeof value === "object" && typeof (value as { studio?: unknown }).studio === "string"
      ? (value as { studio: string }).studio
      : STUDIO.name;
  const exportedAt =
    value && typeof value === "object" && typeof (value as { exportedAt?: unknown }).exportedAt === "string"
      ? (value as { exportedAt: string }).exportedAt
      : new Date().toISOString();
  return {
    version: 1,
    studio,
    exportedAt,
    intakes: rows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
      .map(toStored),
  };
}

function toBackupSummary(row: BackupRow): BackupSummary {
  return {
    id: row.id,
    label: row.label,
    kind: (row.kind as BackupKind) || "manual",
    intakeCount: Number(row.intake_count),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

async function fetchIntakes(sql: Sql): Promise<StoredIntake[]> {
  const rows = await sql<Record<string, unknown>>`select * from intakes order by id`;
  return rows.map(toStored);
}

async function insertIntakeRow(sql: Sql, row: StoredIntake): Promise<void> {
  await sql`
    insert into intakes (
      id, reference, full_name, phone, address_exact, service_area,
      preferred_date, preferred_time, service_type, duration_minutes,
      extras, service_fee, extras_fee, transport_fee, grand_total,
      injuries_flag, injuries_detail, allergies, areas_of_focus,
      pressure, consent_name, consent_at, status, deposit_received,
      therapist_notes, updated_by, created_at, completed_at
    ) values (
      ${row.id},
      ${row.reference},
      ${row.full_name},
      ${row.phone},
      ${row.address_exact},
      ${row.service_area},
      ${row.preferred_date},
      ${row.preferred_time},
      ${row.service_type},
      ${row.duration_minutes},
      ${row.extras},
      ${row.service_fee},
      ${row.extras_fee},
      ${row.transport_fee},
      ${row.grand_total},
      ${row.injuries_flag},
      ${row.injuries_detail},
      ${row.allergies},
      ${row.areas_of_focus},
      ${row.pressure},
      ${row.consent_name},
      ${row.consent_at},
      ${row.status},
      ${row.deposit_received},
      ${row.therapist_notes},
      ${row.updated_by},
      ${row.created_at},
      ${row.completed_at}
    )
  `;
}

async function resetIntakeSequence(sql: Sql, rows: StoredIntake[]): Promise<void> {
  const maxId = rows.reduce((max, row) => Math.max(max, row.id), 0);
  if (maxId > 0) {
    await sql.query("select setval('intakes_id_seq', $1, true)", [maxId]);
  } else {
    await sql.query("select setval('intakes_id_seq', 1, false)", []);
  }
}

async function writeBackup(
  sql: Sql,
  opts: { label: string; kind: BackupKind; createdBy: string },
): Promise<BackupSummary> {
  const intakes = await fetchIntakes(sql);
  const document: BackupDocument = {
    version: 1,
    studio: STUDIO.name,
    exportedAt: new Date().toISOString(),
    intakes,
  };
  const inserted = await sql<BackupRow>`
    insert into studio_backups (label, kind, intake_count, payload, created_by)
    values (
      ${opts.label},
      ${opts.kind},
      ${intakes.length},
      ${JSON.stringify(document)},
      ${opts.createdBy}
    )
    returning id, label, kind, intake_count, payload, created_by, created_at
  `;
  const row = inserted[0];
  if (!row) throw new Error("Could not save snapshot.");
  return toBackupSummary(row);
}

export async function recordRevisionSafe(
  sql: Sql,
  intakeId: number,
  createdBy: string,
  reason: string,
  summary: string,
): Promise<void> {
  try {
    await recordRevision(sql, intakeId, createdBy, reason, summary);
  } catch (error) {
    console.error("[vault] revision skipped", error);
  }
}

export async function recordRevision(
  sql: Sql,
  intakeId: number,
  createdBy: string,
  reason: string,
  summary: string,
): Promise<void> {
  const rows = await sql<Record<string, unknown>>`
    select * from intakes where id = ${intakeId} limit 1
  `;
  const row = rows[0];
  if (!row) return;
  await sql`
    insert into intake_revisions (intake_id, reference, snapshot, reason, summary, created_by)
    values (
      ${intakeId},
      ${asText(row.reference)},
      ${JSON.stringify(row)},
      ${reason},
      ${summary.slice(0, 240)},
      ${createdBy}
    )
  `;
}

async function applyDocument(sql: Sql, document: BackupDocument): Promise<void> {
  await sql`delete from intakes`;
  for (const row of document.intakes) {
    await insertIntakeRow(sql, row);
  }
  await resetIntakeSequence(sql, document.intakes);
}

async function restoreFromDocument(
  sql: Sql,
  document: BackupDocument,
  userId: string,
): Promise<{ restored: number; safetyId: number }> {
  const safety = await writeBackup(sql, {
    label: "Safety copy before restore",
    kind: "safety",
    createdBy: userId,
  });
  try {
    await applyDocument(sql, document);
  } catch (error) {
    const safetyRow = await sql<BackupRow>`
      select payload from studio_backups where id = ${safety.id} limit 1
    `;
    const raw = safetyRow[0]?.payload;
    if (raw) {
      try {
        await applyDocument(sql, parseDocument(raw));
      } catch {
        /* live book may be empty; safety snapshot is still in the vault */
      }
    }
    throw error instanceof Error ? error : new Error("Restore failed.");
  }
  return { restored: document.intakes.length, safetyId: safety.id };
}

async function maybeDailyBackup(sql: Sql, userId: string): Promise<void> {
  const start = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const existing = await sql<{ id: number }>`
    select id from studio_backups
    where kind = ${"auto"} and created_at >= ${start}
    limit 1
  `;
  if (existing.length) return;
  const stamp = new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await writeBackup(sql, {
    label: `Automatic · ${stamp}`,
    kind: "auto",
    createdBy: userId,
  });
}

export const listBackups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    try {
      await maybeDailyBackup(sql, context.userId);
    } catch {
      /* listing still works if auto snapshot fails */
    }
    const rows = await sql<BackupRow>`
      select id, label, kind, intake_count, '' as payload, created_by, created_at
      from studio_backups
      order by created_at desc
      limit 40
    `;
    return rows.map(toBackupSummary);
  });

export const createBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({ label: z.string().trim().max(120).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const stamp = new Date().toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    return writeBackup(sql, {
      label: data.label?.trim() || `Snapshot · ${stamp}`,
      kind: "manual",
      createdBy: context.userId,
    });
  });

export const downloadBackup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<BackupRow>`
      select id, label, kind, intake_count, payload, created_by, created_at
      from studio_backups where id = ${id} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Snapshot not found.");
    return {
      ...toBackupSummary(row),
      document: parseDocument(row.payload),
    };
  });

export const restoreBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<BackupRow>`
      select payload from studio_backups where id = ${id} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Snapshot not found.");
    return restoreFromDocument(sql, parseDocument(row.payload), context.userId);
  });

export const importBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ raw: z.string().min(2).max(2_000_000), label: z.string().max(120).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAmbassador(context.userId);
    const document = parseDocument(data.raw);
    const sql = await getSql();
    const stamp = new Date().toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    const stored = await sql<BackupRow>`
      insert into studio_backups (label, kind, intake_count, payload, created_by)
      values (
        ${data.label?.trim() || `Imported · ${stamp}`},
        ${"import"},
        ${document.intakes.length},
        ${JSON.stringify(document)},
        ${context.userId}
      )
      returning id, label, kind, intake_count, payload, created_by, created_at
    `;
    const row = stored[0];
    if (!row) throw new Error("Could not keep the imported file.");
    const result = await restoreFromDocument(sql, document, context.userId);
    return { ...toBackupSummary(row), ...result };
  });

export const listRevisions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const existing = await sql<RevisionRow>`
      select id, intake_id, reference, snapshot, reason, summary, created_by, created_at
      from intake_revisions
      where intake_id = ${id}
      order by created_at desc
      limit 30
    `;
    if (existing.length === 0) {
      await recordRevision(sql, id, context.userId, "baseline", "On file when first opened");
    }
    const rows = await sql<RevisionRow>`
      select id, intake_id, reference, snapshot, reason, summary, created_by, created_at
      from intake_revisions
      where intake_id = ${id}
      order by created_at desc
      limit 30
    `;
    return rows.map((row) => ({
      id: row.id,
      intakeId: row.intake_id,
      reference: row.reference,
      reason: row.reason,
      summary: row.summary,
      createdBy: row.created_by,
      createdAt: row.created_at,
    })) satisfies RevisionSummary[];
  });

export const restoreRevision = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ intakeId: z.number(), revisionId: z.number() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<RevisionRow>`
      select id, intake_id, reference, snapshot, reason, summary, created_by, created_at
      from intake_revisions
      where id = ${data.revisionId} and intake_id = ${data.intakeId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("That version is gone.");
    await recordRevision(sql, data.intakeId, context.userId, "restored", "Rolled back a previous version");
    const snap = JSON.parse(row.snapshot) as Record<string, unknown>;
    await sql`
      update intakes set
        full_name = ${asText(snap.full_name ?? snap.fullName)},
        phone = ${asText(snap.phone)},
        address_exact = ${asText(snap.address_exact ?? snap.addressExact)},
        service_area = ${asText(snap.service_area ?? snap.serviceArea)},
        preferred_date = ${asText(snap.preferred_date ?? snap.preferredDate)},
        preferred_time = ${asText(snap.preferred_time ?? snap.preferredTime)},
        service_type = ${asText(snap.service_type ?? snap.serviceType)},
        duration_minutes = ${asInt(snap.duration_minutes ?? snap.durationMinutes, 60)},
        extras = ${asText(snap.extras, "[]")},
        service_fee = ${asInt(snap.service_fee ?? snap.serviceFee)},
        extras_fee = ${asInt(snap.extras_fee ?? snap.extrasFee)},
        transport_fee = ${asInt(snap.transport_fee ?? snap.transportFee)},
        grand_total = ${asInt(snap.grand_total ?? snap.grandTotal)},
        injuries_flag = ${asBool(snap.injuries_flag ?? snap.injuriesFlag)},
        injuries_detail = ${asText(snap.injuries_detail ?? snap.injuriesDetail)},
        allergies = ${asText(snap.allergies)},
        areas_of_focus = ${asText(snap.areas_of_focus ?? snap.areasOfFocus, "[]")},
        pressure = ${asText(snap.pressure, "medium")},
        consent_name = ${asText(snap.consent_name ?? snap.consentName)},
        status = ${asText(snap.status, "new")},
        deposit_received = ${asBool(snap.deposit_received ?? snap.depositReceived)},
        therapist_notes = ${asText(snap.therapist_notes ?? snap.therapistNotes)},
        updated_by = ${context.userId},
        completed_at = ${snap.completed_at ? asText(snap.completed_at) : null}
      where id = ${data.intakeId}
    `;
    return { ok: true as const };
  });
