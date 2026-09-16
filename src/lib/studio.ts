import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  AMBASSADOR_SEATS,
  addDays,
  deltaPct,
  emptyRange,
  endOfMonth,
  monthLabel,
  startOfMonth,
  startOfWeek,
  todayInStudio,
  type DayPoint,
} from "@/lib/cycle";
import { extraLabel, serviceLabel } from "@/lib/intake-schema";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Studio access is limited to two ambassadors.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

type AmbassadorRow = {
  user_id: string;
  email: string;
  display_name: string;
  seat: number;
  created_at: string;
};

type AuthUserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

export type AmbassadorPublic = {
  seat: number;
  displayName: string;
  emailMasked: string;
  isYou: boolean;
};

function maskEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed.includes("@")) return "On file";
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return "On file";
  const head = local.slice(0, 1);
  return `${head}•••@${domain}`;
}

async function lookupAuthUser(userId: string): Promise<AuthUserRow | null> {
  const sql = await getSql();
  const rows = await sql<AuthUserRow>`
    select id, name, email from "user" where id = ${userId} limit 1
  `;
  return rows[0] ?? null;
}

export async function assertAmbassador(userId: string): Promise<{ seat: number }> {
  const sql = await getSql();
  const existing = await sql<AmbassadorRow>`
    select user_id, email, display_name, seat, created_at
    from ambassadors
    where user_id = ${userId}
    limit 1
  `;
  const mine = existing[0];
  if (mine) return { seat: mine.seat };

  const occupied = await sql<{ n: number }>`
    select count(*)::int as n from ambassadors
  `;
  const filled = Number(occupied[0]?.n ?? 0);
  if (filled >= AMBASSADOR_SEATS) {
    throw new ForbiddenError();
  }

  const taken = await sql<{ seat: number }>`select seat from ambassadors`;
  const used = new Set(taken.map((row) => Number(row.seat)));
  const seat = used.has(1) ? 2 : 1;
  const profile = await lookupAuthUser(userId);

  try {
    await sql`
      insert into ambassadors (user_id, email, display_name, seat)
      values (
        ${userId},
        ${profile?.email ?? ""},
        ${profile?.name ?? "Ambassador"},
        ${seat}
      )
    `;
  } catch {
    const retry = await sql<AmbassadorRow>`
      select user_id, seat from ambassadors where user_id = ${userId} limit 1
    `;
    if (retry[0]) return { seat: retry[0].seat };
    throw new ForbiddenError();
  }
  return { seat };
}

export const getAmbassadorGate = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*)::int as n from ambassadors`;
  const filled = Number(rows[0]?.n ?? 0);
  return {
    filled,
    cap: AMBASSADOR_SEATS,
    open: filled < AMBASSADOR_SEATS,
  };
});

export const ensureAmbassador = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const seat = await assertAmbassador(context.userId);
    const sql = await getSql();
    const roster = await sql<AmbassadorRow>`
      select user_id, email, display_name, seat, created_at
      from ambassadors
      order by seat
    `;
    return {
      seat: seat.seat,
      roster: roster.map(
        (row): AmbassadorPublic => ({
          seat: row.seat,
          displayName: row.display_name || `Ambassador ${row.seat}`,
          emailMasked: maskEmail(row.email),
          isYou: row.user_id === context.userId,
        }),
      ),
    };
  });

const emailSchema = z
  .string()
  .trim()
  .max(160)
  .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email");

export const getNotifyEmail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const rows = await sql<{ notify_email: string }>`
      select notify_email from studio_settings where id = 1 limit 1
    `;
    return { email: rows[0]?.notify_email ?? "" };
  });

export const updateNotifyEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => emailSchema.parse(typeof input === "string" ? input : ""))
  .handler(async ({ context, data: email }) => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    await sql`
      insert into studio_settings (id, notify_email, updated_at, updated_by)
      values (1, ${email}, now(), ${context.userId})
      on conflict (id) do update
        set notify_email = ${email},
            updated_at = now(),
            updated_by = ${context.userId}
    `;
    return { email };
  });

export async function readNotifyEmail(): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ notify_email: string }>`
    select notify_email from studio_settings where id = 1 limit 1
  `;
  return (rows[0]?.notify_email ?? "").trim();
}

export async function sendBookingNotification(payload: {
  reference: string;
  fullName: string;
  phone: string;
  addressExact: string;
  serviceArea: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  durationMinutes: number;
  extras: string[];
  grandTotal: number;
  injuriesFlag: boolean;
  injuriesDetail: string;
  allergies: string;
  pressure: string;
}): Promise<void> {
  const email = await readNotifyEmail();
  if (!email) return;

  const extras =
    payload.extras.length > 0 ? payload.extras.map(extraLabel).join(", ") : "None";
  const body = {
    _subject: `New D-Dera booking ${payload.reference}`,
    _template: "table",
    _captcha: "false",
    reference: payload.reference,
    name: payload.fullName,
    phone: payload.phone,
    area: payload.serviceArea,
    address: payload.addressExact,
    date: payload.preferredDate,
    time: payload.preferredTime,
    service: serviceLabel(payload.serviceType),
    duration: `${payload.durationMinutes} mins`,
    extras,
    total: String(payload.grandTotal),
    injuries: payload.injuriesFlag ? payload.injuriesDetail || "Yes" : "No",
    allergies: payload.allergies || "None noted",
    pressure: payload.pressure,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    /* booking already saved — never block the client on mail */
  } finally {
    clearTimeout(timer);
  }
}

type OpsRow = {
  preferred_date: string;
  status: string;
  grand_total: number;
  deposit_received: boolean;
};

function isSuccessful(status: string): boolean {
  return status === "confirmed" || status === "completed";
}

function isCollected(status: string, deposit: boolean): boolean {
  return status === "completed" || deposit;
}

function tally(rows: OpsRow[]): { bookings: number; successful: number; revenue: number } {
  let bookings = 0;
  let successful = 0;
  let revenue = 0;
  for (const row of rows) {
    bookings += 1;
    if (isSuccessful(row.status)) successful += 1;
    if (isCollected(row.status, Boolean(row.deposit_received))) {
      revenue += Number(row.grand_total) || 0;
    }
  }
  return { bookings, successful, revenue };
}

function fillDays(from: string, to: string, rows: OpsRow[]): DayPoint[] {
  const points = emptyRange(from, to);
  const byDate = new Map(points.map((point) => [point.date, point]));
  for (const row of rows) {
    const point = byDate.get(row.preferred_date);
    if (!point) continue;
    point.bookings += 1;
    if (isSuccessful(row.status)) point.successful += 1;
    if (isCollected(row.status, Boolean(row.deposit_received))) {
      point.revenue += Number(row.grand_total) || 0;
    }
  }
  return points;
}

export type CycleBlock = {
  label: string;
  from: string;
  to: string;
  bookings: number;
  successful: number;
  revenue: number;
  previous: { bookings: number; successful: number; revenue: number };
  successfulDelta: number | null;
  revenueDelta: number | null;
  days: DayPoint[];
};

export type OpsSnapshot = {
  today: { date: string; bookings: number; successful: number; revenue: number };
  week: CycleBlock;
  month: CycleBlock;
};

export const getOpsSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OpsSnapshot> => {
    await assertAmbassador(context.userId);
    const sql = await getSql();
    const today = todayInStudio();
    const weekFrom = startOfWeek(today);
    const weekTo = addDays(weekFrom, 6);
    const prevWeekFrom = addDays(weekFrom, -7);
    const prevWeekTo = addDays(weekFrom, -1);
    const monthFrom = startOfMonth(today);
    const monthTo = endOfMonth(today);
    const prevMonthEnd = addDays(monthFrom, -1);
    const prevMonthFrom = startOfMonth(prevMonthEnd);
    const rangeFrom = prevMonthFrom < prevWeekFrom ? prevMonthFrom : prevWeekFrom;
    const rangeTo = monthTo > weekTo ? monthTo : weekTo;

    const rows = await sql<OpsRow>`
      select preferred_date, status, grand_total, deposit_received
      from intakes
      where preferred_date >= ${rangeFrom} and preferred_date <= ${rangeTo}
    `;

    const inRange = (from: string, to: string) =>
      rows.filter((row) => row.preferred_date >= from && row.preferred_date <= to);

    const todayRows = inRange(today, today);
    const weekRows = inRange(weekFrom, weekTo);
    const prevWeekRows = inRange(prevWeekFrom, prevWeekTo);
    const monthRows = inRange(monthFrom, monthTo);
    const prevMonthRows = inRange(prevMonthFrom, prevMonthEnd);

    const weekTotals = tally(weekRows);
    const prevWeekTotals = tally(prevWeekRows);
    const monthTotals = tally(monthRows);
    const prevMonthTotals = tally(prevMonthRows);

    return {
      today: { date: today, ...tally(todayRows) },
      week: {
        label: "This week",
        from: weekFrom,
        to: weekTo,
        ...weekTotals,
        previous: prevWeekTotals,
        successfulDelta: deltaPct(weekTotals.successful, prevWeekTotals.successful),
        revenueDelta: deltaPct(weekTotals.revenue, prevWeekTotals.revenue),
        days: fillDays(weekFrom, weekTo, weekRows),
      },
      month: {
        label: monthLabel(today),
        from: monthFrom,
        to: monthTo,
        ...monthTotals,
        previous: prevMonthTotals,
        successfulDelta: deltaPct(monthTotals.successful, prevMonthTotals.successful),
        revenueDelta: deltaPct(monthTotals.revenue, prevMonthTotals.revenue),
        days: fillDays(monthFrom, monthTo, monthRows),
      },
    };
  });
