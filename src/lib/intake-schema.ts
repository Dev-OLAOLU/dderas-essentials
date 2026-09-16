import { z } from "zod";

export const STUDIO = {
  name: "D-Dera's Essentials",
  shortName: "D-Dera's",
  tagline: "Relax · Unwind · Restore",
  email: "chideraal29@gmail.com",
  whatsappDisplay: "0901 692 7305",
  whatsappE164: "2349016927305",
  homeOnly: true,
} as const;

export const CORE_SERVICES = [
  {
    id: "swedish",
    label: "Swedish Massage",
    blurb:
      "A gentle, full-body massage designed to ease stress, improve circulation, and promote deep relaxation.",
    prices: { 60: 45000, 90: 60000, 120: 90000 },
  },
  {
    id: "deep-tissue",
    label: "Deep Tissue Massage",
    blurb:
      "Targets deeper muscle layers to relieve chronic tension, stiffness, and muscle knots.",
    prices: { 60: 45000, 90: 65000 },
  },
  {
    id: "aromatherapy",
    label: "Aromatherapy Massage",
    blurb:
      "A soothing massage combined with essential oils to relax the body, uplift mood, and reduce stress.",
    prices: { 60: 40000, 90: 60000 },
  },
] as const;

export const ASMR_SERVICE = {
  id: "asmr",
  label: "ASMR Relaxation Session",
  blurb:
    "An immersive sensory experience featuring gentle sounds, soft-spoken guidance, and calming triggers to reduce stress and promote deep relaxation.",
  prices: { 30: 30000, 45: 45000, 60: 60000 },
} as const;

export const ALL_SERVICES = [...CORE_SERVICES, ASMR_SERVICE] as const;

export const EXTRAS = [
  {
    id: "head-neck-shoulder",
    label: "Head, Neck & Shoulder Massage",
    blurb:
      "Focuses on common tension areas to relieve headaches, neck stiffness, and upper-body stress.",
    minutes: 30,
    price: 30000,
  },
  {
    id: "back-relief",
    label: "Back Relief Massage",
    blurb:
      "Targets the upper and lower back to ease muscle tightness, aches, and postural discomfort.",
    minutes: 30,
    price: 30000,
  },
  {
    id: "foot-reflexology",
    label: "Foot Reflexology",
    blurb:
      "Applies pressure to specific points on the feet to improve circulation and relieve well-being.",
    minutes: 30,
    price: 20000,
  },
  {
    id: "scalp",
    label: "Scalp Massage",
    blurb:
      "A calming treatment designed to improve flexibility, reduce stiffness, and support better mobility.",
    minutes: 30,
    price: 25000,
  },
] as const;

export const PRESSURE_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "firm", label: "Firm" },
] as const;

export const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

export const BODY_AREAS = [
  { id: "head", label: "Head / scalp" },
  { id: "neck", label: "Neck" },
  { id: "shoulders", label: "Shoulders" },
  { id: "upper-back", label: "Upper back" },
  { id: "lower-back", label: "Lower back" },
  { id: "chest", label: "Chest" },
  { id: "arms", label: "Arms / hands" },
  { id: "hips", label: "Hips" },
  { id: "legs", label: "Legs" },
  { id: "feet", label: "Feet" },
  { id: "full-body", label: "Full body" },
] as const;

export const STATUSES = [
  { id: "new", label: "New" },
  { id: "reviewed", label: "Reviewed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
] as const;

export type IntakeStatus = (typeof STATUSES)[number]["id"];
export type ServiceId = (typeof ALL_SERVICES)[number]["id"];

export function isCoreService(id: string): boolean {
  return CORE_SERVICES.some((s) => s.id === id);
}

export function getService(id: string) {
  return ALL_SERVICES.find((s) => s.id === id);
}

export function durationsFor(serviceId: string): number[] {
  const service = getService(serviceId);
  if (!service) return [];
  return Object.keys(service.prices).map(Number).sort((a, b) => a - b);
}

export function serviceFee(serviceId: string, minutes: number): number {
  const service = getService(serviceId);
  if (!service) return 0;
  const prices = service.prices as Record<number, number>;
  return prices[minutes] ?? 0;
}

export function extrasFee(extraIds: string[]): number {
  return extraIds.reduce((sum, id) => {
    const extra = EXTRAS.find((item) => item.id === id);
    return sum + (extra?.price ?? 0);
  }, 0);
}

export function extrasMinutes(extraIds: string[]): number {
  return extraIds.reduce((sum, id) => {
    const extra = EXTRAS.find((item) => item.id === id);
    return sum + (extra?.minutes ?? 0);
  }, 0);
}

export function grandTotal(service: number, extras: number, transport: number): number {
  return service + extras + transport;
}

export function naira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function serviceLabel(id: string): string {
  return getService(id)?.label ?? id;
}

export function extraLabel(id: string): string {
  return EXTRAS.find((item) => item.id === id)?.label ?? id;
}

export function areaLabel(id: string): string {
  return BODY_AREAS.find((item) => item.id === id)?.label ?? id;
}

export function pressureLabel(id: string): string {
  return PRESSURE_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export function statusLabel(id: string): string {
  return STATUSES.find((item) => item.id === id)?.label ?? id;
}

const nonEmpty = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(200);

export const intakeInputSchema = z
  .object({
    fullName: nonEmpty("Full name").max(120),
    phone: nonEmpty("Phone number").max(40),
    addressExact: nonEmpty("Exact address").max(240),
    serviceArea: nonEmpty("Location / service area").max(120),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    preferredTime: nonEmpty("Choose a start time"),
    serviceType: z.string().min(1, "Choose a service"),
    durationMinutes: z.number().int().min(30).max(180),
    extras: z.array(z.string()).max(8),
    transportFee: z.number().int().min(0).max(1_000_000),
    injuriesFlag: z.boolean(),
    injuriesDetail: z.string().trim().max(600).default(""),
    allergies: z.string().trim().max(400).default(""),
    areasOfFocus: z.array(z.string()).max(16),
    pressure: z.enum(["light", "medium", "firm"]),
    consentName: nonEmpty("Type your full name to confirm"),
    consentPolicy: z
      .boolean()
      .refine((v) => v === true, "Please confirm the booking policy"),
  })
  .superRefine((value, ctx) => {
    const service = getService(value.serviceType);
    if (!service) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceType"],
        message: "Choose a service from the menu",
      });
      return;
    }
    const allowed = durationsFor(value.serviceType);
    if (!allowed.includes(value.durationMinutes)) {
      ctx.addIssue({
        code: "custom",
        path: ["durationMinutes"],
        message: "Choose a duration for this service",
      });
    }
    if (value.extras.length > 0 && !isCoreService(value.serviceType)) {
      ctx.addIssue({
        code: "custom",
        path: ["extras"],
        message: "Extras must be booked with a core therapy",
      });
    }
    for (const extra of value.extras) {
      if (!EXTRAS.some((item) => item.id === extra)) {
        ctx.addIssue({
          code: "custom",
          path: ["extras"],
          message: "Unknown extra selected",
        });
      }
    }
    if (value.injuriesFlag && value.injuriesDetail.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["injuriesDetail"],
        message: "Please share a short detail",
      });
    }
  });

export type IntakeInput = z.infer<typeof intakeInputSchema>;

export type IntakeDraft = Omit<IntakeInput, "consentPolicy"> & {
  consentPolicy: boolean;
};

export function emptyDraft(): IntakeDraft {
  return {
    fullName: "",
    phone: "",
    addressExact: "",
    serviceArea: "",
    preferredDate: "",
    preferredTime: "",
    serviceType: "swedish",
    durationMinutes: 60,
    extras: [],
    transportFee: 0,
    injuriesFlag: false,
    injuriesDetail: "",
    allergies: "",
    areasOfFocus: [],
    pressure: "medium",
    consentName: "",
    consentPolicy: false,
  };
}

export type IntakeSummary = {
  id: number;
  reference: string;
  fullName: string;
  phone: string;
  serviceArea: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  durationMinutes: number;
  extras: string[];
  serviceFee: number;
  extrasFee: number;
  transportFee: number;
  grandTotal: number;
  status: IntakeStatus;
  depositReceived: boolean;
  createdAt: string;
};

export type IntakeRecord = IntakeSummary & {
  addressExact: string;
  injuriesFlag: boolean;
  injuriesDetail: string;
  allergies: string;
  areasOfFocus: string[];
  pressure: string;
  consentName: string;
  consentAt: string;
  therapistNotes: string;
};
