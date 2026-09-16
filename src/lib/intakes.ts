import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  extrasFee as calcExtrasFee,
  grandTotal as calcGrandTotal,
  intakeInputSchema,
  serviceFee as calcServiceFee,
  type IntakeInput,
  type IntakeRecord,
  type IntakeStatus,
  type IntakeSummary,
} from "@/lib/intake-schema";
import { assertAmbassador, sendBookingNotification } from "@/lib/studio";
import { recordRevisionSafe } from "@/lib/vault";

type IntakeRow = {
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
  created_at: string;
};

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toIso(value: string): string {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return value;
}

function toSummary(row: IntakeRow): IntakeSummary {
  return {
    id: row.id,
    reference: row.reference,
    fullName: row.full_name,
    phone: row.phone,
    serviceArea: row.service_area,
    preferredDate: toIso(row.preferred_date),
    preferredTime: row.preferred_time,
    serviceType: row.service_type,
    durationMinutes: Number(row.duration_minutes),
    extras: parseJsonArray(row.extras),
    serviceFee: Number(row.service_fee),
    extrasFee: Number(row.extras_fee),
    transportFee: Number(row.transport_fee),
    grandTotal: Number(row.grand_total),
    status: row.status as IntakeStatus,
    depositReceived: Boolean(row.deposit_received),
    createdAt: row.created_at,
  };
}

function toRecord(row: IntakeRow): IntakeRecord {
  return {
    ...toSummary(row),
    addressExact: row.address_exact,
    injuriesFlag: Boolean(row.injuries_flag),
    injuriesDetail: row.injuries_detail,
    allergies: row.allergies,
    areasOfFocus: parseJsonArray(row.areas_of_focus),
    pressure: row.pressure,
    consentName: row.consent_name,
    consentAt: row.consent_at,
    therapistNotes: row.therapist_notes,
  };
}

function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 4; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `DE-${token}`;
}

export const submitIntake = createServerFn({ method: "POST" })
  .validator((input: unknown) => intakeInputSchema.parse(input))
  .handler(async ({ data }: { data: IntakeInput }) => {
    const sql = await getSql();
    let reference = makeReference();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const existing = await sql<{ id: number }>`
        select id from intakes where reference = ${reference} limit 1
      `;
      if (existing.length === 0) break;
      reference = makeReference();
    }

    const serviceFee = calcServiceFee(data.serviceType, data.durationMinutes);
    const extrasFee = calcExtrasFee(data.extras);
    const transportFee = data.transportFee;
    const grandTotal = calcGrandTotal(serviceFee, extrasFee, transportFee);

    const inserted = await sql<{ id: number; reference: string }>`
      insert into intakes (
        reference, full_name, phone, address_exact, service_area,
        preferred_date, preferred_time, service_type, duration_minutes,
        extras, service_fee, extras_fee, transport_fee, grand_total,
        injuries_flag, injuries_detail, allergies, areas_of_focus,
        pressure, consent_name, status
      ) values (
        ${reference},
        ${data.fullName}, ${data.phone}, ${data.addressExact}, ${data.serviceArea},
        ${data.preferredDate}, ${data.preferredTime}, ${data.serviceType},
        ${data.durationMinutes}, ${JSON.stringify(data.extras)},
        ${serviceFee}, ${extrasFee}, ${transportFee}, ${grandTotal},
        ${data.injuriesFlag}, ${data.injuriesDetail}, ${data.allergies},
        ${JSON.stringify(data.areasOfFocus)}, ${data.pressure},
        ${data.consentName}, ${"new"}
      )
      returning id, reference
    `;

    const row = inserted[0];
    if (!row) throw new Error("Could not save your booking. Please try again.");

    await recordRevisionSafe(sql, row.id, "client", "received", "Client submitted intake");

    void sendBookingNotification({
      reference: row.reference,
      fullName: data.fullName,
      phone: data.phone,
      addressExact: data.addressExact,
      serviceArea: data.serviceArea,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      serviceType: data.serviceType,
      durationMinutes: data.durationMinutes,
      extras: data.extras,
      grandTotal,
      injuriesFlag: data.injuriesFlag,
      injuriesDetail: data.injuriesDetail,
      allergies: data.allergies,
      pressure: data.pressure,
    });

    return {
      id: row.id,
      reference: row.reference,
      serviceFee,
      extrasFee,
      transportFee,
      grandTotal,
    };
  });

export const listIntakes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<IntakeRow>`
      select * from intakes order by created_at desc
    `;
    return rows.map(toSummary);
  });

export const getIntake = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<IntakeRow>`
      select * from intakes where id = ${id} limit 1
    `;
    const row = rows[0];
    return row ? toRecord(row) : null;
  });

export const updateIntakeStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const value = input as { id: number; status: IntakeStatus };
    return { id: Number(value.id), status: value.status };
  })
  .handler(async ({ data, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    await recordRevisionSafe(
      sql,
      data.id,
      context.userId,
      "status",
      `Status set to ${data.status}`,
    );
    if (data.status === "completed") {
      await sql`
        update intakes
        set status = ${data.status},
            updated_by = ${context.userId},
            completed_at = coalesce(completed_at, now())
        where id = ${data.id}
      `;
    } else {
      await sql`
        update intakes
        set status = ${data.status}, updated_by = ${context.userId}
        where id = ${data.id}
      `;
    }
    return { ok: true as const };
  });

export const updateBookingAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const value = input as {
      id: number;
      transportFee: number;
      depositReceived: boolean;
      notes: string;
    };
    return {
      id: Number(value.id),
      transportFee: Math.max(0, Math.round(Number(value.transportFee) || 0)),
      depositReceived: Boolean(value.depositReceived),
      notes: String(value.notes ?? "").slice(0, 4000),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const existing = await sql<{ extras_fee: number; service_fee: number }>`
      select service_fee, extras_fee from intakes where id = ${data.id} limit 1
    `;
    const row = existing[0];
    if (!row) throw new Error("Booking not found");
    await recordRevisionSafe(
      sql,
      data.id,
      context.userId,
      "admin",
      `Transport ₦${data.transportFee.toLocaleString("en-NG")} · notes ${data.depositReceived ? "+ deposit" : "updated"}`,
    );
    const grand = Number(row.service_fee) + Number(row.extras_fee) + data.transportFee;
    await sql`
      update intakes
      set transport_fee = ${data.transportFee},
          grand_total = ${grand},
          deposit_received = ${data.depositReceived},
          therapist_notes = ${data.notes},
          updated_by = ${context.userId}
      where id = ${data.id}
    `;
    return { ok: true as const, grandTotal: grand };
  });
