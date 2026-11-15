// Shared data model for scan results. Safe to import on both client and server.

export type Lang = "en" | "hi";

/** Patient-facing text in both UI languages. */
export type Bi = { en: string; hi: string };

export type Slot = "morning" | "afternoon" | "evening" | "night";
export type Food = "before" | "after" | "with" | "empty" | "any" | "unknown";
export type Severity = "low" | "moderate" | "high";

/** Fields that carry a per-field confidence score. */
export type MedField = "name" | "strength" | "dose" | "frequency" | "timing" | "food";

export interface Medicine {
  id: string;
  /** The line exactly as the AI read it off the paper, so misreadings are easy to spot. */
  writtenAs: string;
  name: string;
  /** Other names the handwriting could plausibly be; non-empty means the name needs checking. */
  alternatives: string[];
  generic: string;
  strength: string;
  dose: string;
  frequency: string;
  timing: string;
  food: Food;
  duration: string;
  slots: Slot[];
  description: Bi;
  confidence: Record<MedField, number>;
}

export interface Condition {
  name: Bi;
  note: Bi;
  confidence: number;
}

export interface Interaction {
  medicine: string;
  with: string;
  effect: Bi;
  severity: Severity;
}

export interface ScanResult {
  medicines: Medicine[];
  conditions: Condition[];
  diet: { include: Bi[]; avoid: Bi[] };
  interactions: Interaction[];
  lifestyle: Bi[];
  warnings: Bi[];
  /** Other notes from the prescription (complaints, vitals, tests) used to ground the insights. */
  context: string;
  provider?: string;
  /** True when the backup model did the reading; every field is then flagged for checking. */
  fallback?: boolean;
}

export const FOODS: Food[] = ["before", "after", "with", "empty", "any", "unknown"];
export const SLOTS: Slot[] = ["morning", "afternoon", "evening", "night"];
export const SEVERITIES: Severity[] = ["low", "moderate", "high"];
export const MED_FIELDS: MedField[] = ["name", "strength", "dose", "frequency", "timing", "food"];

/** Fields the user can edit on the confirm screen. */
export const EDITABLE_FIELDS = ["name", "strength", "dose", "frequency", "timing", "food", "duration"] as const;
export type EditableMedicine = Pick<Medicine, (typeof EDITABLE_FIELDS)[number]>;

/** Anything scored below this is flagged for the user to verify. */
export const LOW_CONFIDENCE = 0.7;

export const isLow = (score: number) => score < LOW_CONFIDENCE;

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function editable(m: Medicine): EditableMedicine {
  return {
    name: m.name,
    strength: m.strength,
    dose: m.dose,
    frequency: m.frequency,
    timing: m.timing,
    food: m.food,
    duration: m.duration,
  };
}

export function blankMedicine(): Medicine {
  return {
    id: newId(),
    writtenAs: "",
    name: "",
    alternatives: [],
    generic: "",
    strength: "",
    dose: "",
    frequency: "",
    timing: "",
    food: "unknown",
    duration: "",
    slots: [],
    description: { en: "", hi: "" },
    // Typed in by the user, so nothing to flag.
    confidence: { name: 1, strength: 1, dose: 1, frequency: 1, timing: 1, food: 1 },
  };
}
