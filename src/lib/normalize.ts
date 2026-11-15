// Coerces whatever the model returned into a well-formed ScanResult.
// Models drift from the requested shape, so nothing here trusts the input.

import {
  FOODS,
  MED_FIELDS,
  SEVERITIES,
  SLOTS,
  newId,
  type Bi,
  type Condition,
  type Food,
  type Interaction,
  type MedField,
  type Medicine,
  type ScanResult,
  type Severity,
  type Slot,
} from "./model";

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function str(v: unknown, max = 160): string {
  if (typeof v === "number") return String(v);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Confidence in 0..1; accepts 0-100 percentages too. */
function score(v: unknown, fallback = 0.5): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
}

function bi(v: unknown): Bi {
  if (typeof v === "string") return { en: str(v, 600), hi: str(v, 600) };
  const o = obj(v);
  const en = str(o.en, 600);
  const hi = str(o.hi, 600);
  return { en: en || hi, hi: hi || en };
}

const biList = (v: unknown, max = 8) =>
  list(v)
    .map(bi)
    .filter((b) => b.en)
    .slice(0, max);

function medicine(v: unknown): Medicine | null {
  const o = obj(v);
  const name = str(o.name);
  if (!name) return null;

  const rawConf = o.confidence;
  const confObj = obj(rawConf);
  const confidence = Object.fromEntries(
    MED_FIELDS.map((f) => [f, typeof rawConf === "number" ? score(rawConf) : score(confObj[f])]),
  ) as Record<MedField, number>;

  const slots = list(o.slots).map((s) => str(s).toLowerCase());

  // Drop "alternatives" that are just the same medicine (Oflox / Ofloxacin, Betadine / Betadine Gargle).
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nameKey = key(name);
  const alternatives = [...new Set(list(o.alternatives).map((a) => str(a, 60)))]
    .filter((a) => {
      const k = key(a);
      return k && !k.includes(nameKey) && !nameKey.includes(k);
    })
    .slice(0, 3);
  // A name the model admits could be something else is never shown as certain.
  if (alternatives.length > 0) confidence.name = Math.min(confidence.name, 0.6);

  return {
    id: newId(),
    writtenAs: str(o.written_as ?? o.writtenAs, 200),
    name,
    alternatives,
    generic: str(o.generic),
    strength: str(o.strength, 60),
    dose: str(o.dose, 80),
    frequency: str(o.frequency, 80),
    timing: str(o.timing, 80),
    food: FOODS.includes(o.food as Food) ? (o.food as Food) : "unknown",
    duration: str(o.duration, 60),
    slots: SLOTS.filter((s: Slot) => slots.includes(s)),
    description: bi(o.description),
    confidence,
  };
}

function condition(v: unknown): Condition | null {
  const o = obj(v);
  const name = bi(o.name);
  if (!name.en) return null;
  return { name, note: bi(o.note), confidence: score(o.confidence) };
}

function interaction(v: unknown): Interaction | null {
  const o = obj(v);
  const effect = bi(o.effect);
  if (!effect.en) return null;
  const severity = str(o.severity).toLowerCase() as Severity;
  return {
    medicine: str(o.medicine),
    with: str(o.with),
    effect,
    severity: SEVERITIES.includes(severity) ? severity : "moderate",
  };
}

const notNull = <T,>(v: T | null): v is T => v !== null;

export function normalizeResult(raw: unknown): { result: ScanResult; legible: boolean } {
  const o = obj(raw);
  const diet = obj(o.diet);
  const result: ScanResult = {
    medicines: list(o.medicines).map(medicine).filter(notNull).slice(0, 20),
    conditions: list(o.conditions).map(condition).filter(notNull).slice(0, 6),
    diet: { include: biList(diet.include), avoid: biList(diet.avoid) },
    interactions: list(o.interactions).map(interaction).filter(notNull).slice(0, 12),
    lifestyle: biList(o.lifestyle),
    warnings: biList(o.warnings, 5),
    context: str(o.context, 300),
  };
  return { result, legible: o.legible !== false };
}
