// AI provider chain: Gemini first (retried when busy), Groq as fallback.
// Server-only: reads API keys from the environment.
//
// Work is split in two steps so each answer stays small and focused:
//   1. readPrescription: photo -> medicines only, each with the line copied as written
//   2. getInsights: confirmed medicines (text only) -> ingredients, schedule, descriptions,
//      conditions, diet, lifestyle

import { normalizeResult } from "./normalize";
import { MED_FIELDS, type EditableMedicine, type ScanResult } from "./model";

// The whole chain must finish inside the API route's 60 s limit (maxDuration).
const CHAIN_BUDGET_MS = 55_000;
// Per-call ceilings, so one hanging model can't use up the whole budget.
const PRIMARY_TIMEOUT_MS = 20_000;
const BACKUP_TIMEOUT_MS = 18_000;
// Don't start a call with less time than this left.
const MIN_CALL_MS = 4_000;
// Gemini "high demand" (503) and rate-limit (429) errors are usually brief.
const GEMINI_RETRY_DELAYS_MS = [1500, 4000];
// Groq's free tier rejects requests that may write more than 1000 output tokens per minute.
const GROQ_MAX_TOKENS = () => Number(process.env.GROQ_MAX_TOKENS) || 1000;
// Readings from the backup model are capped below the "unclear" threshold so everything gets checked.
const FALLBACK_CONFIDENCE_CAP = 0.6;

const geminiModel = () => process.env.GEMINI_MODEL || "gemini-3.8-flash";
// A second Gemini model tried before Groq: newer models sometimes hang under load while older ones answer.
const geminiBackupModel = () => process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash";
const groqVisionModel = () => process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const groqTextModel = () => process.env.GROQ_TEXT_MODEL || groqVisionModel();

export type AiErrorCode = "no_keys" | "busy" | "failed";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

class ProviderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Image = { base64: string; mime: string };

/** Abort signal for a call: its own ceiling or the chain deadline, whichever comes first. */
function callSignal(deadline: number, ceilingMs: number) {
  const left = deadline - Date.now();
  if (left < MIN_CALL_MS) throw new ProviderError(504, "Out of time for another attempt");
  return AbortSignal.timeout(Math.min(ceilingMs, left));
}

const SHORTHAND = `Shorthand:
- OD = once a day, BD/BID = twice a day, TDS/TID = three times a day, QID = four times a day, HS = at bedtime, SOS = only when needed, stat = immediately
- AC = before food, PC = after food, E/S = empty stomach
- "1-0-1" style = morning-afternoon-night counts (1-0-1 = morning and night, 1-1-1 = three times, 0-0-1 = night only)
- "x 5 days", "x5d", "5/7" = 5 days; "1/12" = 1 month
- Tab = tablet, Cap = capsule, Syp = syrup, Inj = injection, Oint = ointment
- Hindi notes: "खाने के बाद" = after food, "खाने से पहले" = before food, "खाली पेट" = empty stomach, "सुबह" = morning, "रात" = night`;

const READ_PROMPT = `You are an experienced Indian pharmacist reading a photo of a handwritten prescription. In this step your ONLY job is to read the medicines accurately.

How to read:
1. Find the Rx section (usually a numbered list). For each medicine line, FIRST copy exactly what is written into "written_as", letter by letter, including dose and shorthand (for example "Tab Xyzol 500 1-0-1 x5d"). Use [?] for letters you cannot make out.
2. THEN decode that line into the other fields.
3. Never replace what is written with a different, more familiar medicine. Use your knowledge of Indian brands (for example Dolo, Pan, Telma, Ecosprin, Rablet-D, Oflox, Sinarest, Montair LC, Azithral, Zerodol-SP, Betadine) only to decode letters that are actually on the paper. If the letters don't clearly match a brand you know, keep the name as written and give it a low confidence.
4. Crossed-out words are not medicines. Lab tests (CBC, LFT, KFT, Widal, dengue, etc.), vitals and complaints are not medicines.
5. A bracket or line drawn across several medicines applies its note (duration, food instruction, etc.) to all of them.
6. Every numbered line is its own medicine. Never merge two lines into one, even when a note or bracket spans both.
7. Handwritten brand names are often ambiguous. In "alternatives", list up to 3 other, different real medicines the same letters could plausibly be (not the generic name or another form of the same medicine). If there is any plausible alternative, the name confidence must be below 0.7. Use [] only when the name is clearly legible.

${SHORTHAND}

Confidence (0 to 1) for each field = how clearly that field can be read on the paper. Use below 0.7 whenever you are unsure or inferring. If a field is simply not written, use "" (or "unknown" for food) with confidence 1.

"context": one short English line summarising anything else written that helps understand the case: complaints/symptoms, vitals, tests ordered. Never include names, phone numbers or other personal details.

If the image is not a prescription or is completely unreadable, return "legible": false and an empty "medicines" list.

Return ONLY compact JSON (no indentation) in this shape (values in <> describe what to put there):
{
  "legible": true,
  "context": "<complaints, vitals, tests ordered>",
  "medicines": [{
    "written_as": "<the line exactly as written>",
    "name": "<brand name>",
    "alternatives": ["<other names the handwriting could be>"],
    "strength": "<e.g. 500 mg, or empty>",
    "dose": "<e.g. 1 tablet, 5 ml, or empty>",
    "frequency": "<plain English, e.g. Twice a day>",
    "timing": "<plain English, e.g. Morning and night>",
    "food": "<before | after | with | empty | any | unknown>",
    "duration": "<e.g. 5 days, or empty>",
    "confidence": { "name": <0 to 1>, "strength": <0 to 1>, "dose": <0 to 1>, "frequency": <0 to 1>, "timing": <0 to 1>, "food": <0 to 1> }
  }]
}`;

function insightsPrompt(meds: EditableMedicine[], context: string) {
  return `You are an experienced Indian clinical pharmacist explaining a prescription to a patient in simple words.

Other notes on the prescription: ${context || "none"}

Medicines (confirmed by the patient, treat names as Indian brand names where applicable):
${JSON.stringify(meds, null, 2)}

For EACH medicine above, in the same order, return: "name" (copied unchanged), "generic" (active ingredients), "slots" (times of day from its frequency and timing: any of "morning", "afternoon", "evening", "night"; [] for as-needed) and "description" (1-2 short sentences: what it is and what it is commonly prescribed for). If you do not recognise a medicine, say so plainly in the description instead of guessing.

Then, for this set of medicines:
- "conditions": up to 3 conditions they are typically prescribed for. An educated guess, not a diagnosis; "note" says briefly why. "confidence" 0 to 1.
- "diet": 3 "include" and 3 "avoid" tips suited to an everyday Indian diet (dal, roti, rice, sabzi, curd, fruit, chai, etc.).
- "interactions": up to 3 real food, drink or supplement interactions with these specific medicines (alcohol, dairy, tea/coffee, iron/calcium, grapefruit, etc.). "severity" is "low", "moderate" or "high". [] if none are notable.
- "lifestyle": 3 short daily habit tips.
- "warnings": safety issues a pharmacist should look at (same ingredient twice, unusual dose, unrecognised medicine). [] if none.

Every { "en", "hi" } pair: "en" is simple English, "hi" is natural everyday Hindi in Devanagari. Keep every item under 20 words; brevity matters.

Return ONLY compact JSON (no indentation) in this shape:
{
  "medicines": [{ "name": "...", "generic": "...", "slots": [], "description": { "en": "...", "hi": "..." } }],
  "conditions": [{ "name": { "en": "...", "hi": "..." }, "note": { "en": "...", "hi": "..." }, "confidence": 0.8 }],
  "diet": { "include": [{ "en": "...", "hi": "..." }], "avoid": [{ "en": "...", "hi": "..." }] },
  "interactions": [{ "medicine": "...", "with": "...", "effect": { "en": "...", "hi": "..." }, "severity": "moderate" }],
  "lifestyle": [{ "en": "...", "hi": "..." }],
  "warnings": [{ "en": "...", "hi": "..." }]
}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function gemini(
  model: string,
  prompt: string,
  image: Image | undefined,
  deadline: number,
  ceilingMs: number,
): Promise<string> {
  const signal = callSignal(deadline, ceilingMs);
  const parts: object[] = [{ text: prompt }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
      signal,
    },
  );
  if (!res.ok) throw new ProviderError(res.status, `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    const reason = candidate?.finishReason ?? data?.promptFeedback?.blockReason ?? "unknown";
    throw new ProviderError(502, `Gemini returned no text (${reason})`);
  }
  return text;
}

async function geminiWithRetry(
  model: string,
  prompt: string,
  image: Image | undefined,
  deadline: number,
  ceilingMs: number,
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini(model, prompt, image, deadline, ceilingMs);
    } catch (e) {
      const busy = e instanceof ProviderError && [429, 500, 503].includes(e.status);
      const delay = GEMINI_RETRY_DELAYS_MS[attempt];
      // Leave room for the fallback models rather than spending the budget on retries.
      if (!busy || delay === undefined || deadline - Date.now() < delay + 2 * PRIMARY_TIMEOUT_MS) throw e;
      console.warn(`[tatva] ${model} busy (${(e as ProviderError).status}), retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}

async function groq(prompt: string, image: Image | undefined, deadline: number): Promise<string> {
  const signal = callSignal(deadline, Infinity);
  const content = image
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.base64}` } },
      ]
    : prompt;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY ?? ""}` },
    body: JSON.stringify({
      model: image ? groqVisionModel() : groqTextModel(),
      temperature: 0.1,
      max_tokens: GROQ_MAX_TOKENS(),
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
    signal,
  });
  if (!res.ok) throw new ProviderError(res.status, `Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const choice = data?.choices?.[0];
  const text: string = choice?.message?.content ?? "";
  if (!text) throw new ProviderError(502, "Groq returned no text");
  if (choice?.finish_reason === "length") throw new ProviderError(502, "Groq answer was cut off by max_tokens");
  return text;
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new ProviderError(502, "Model did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

type ChainResult = { result: ScanResult; legible: boolean; primary: boolean };

// After a provider times out or stays busy, skip it for a while instead of waiting on it every request.
// Per server instance, like the result cache.
const COOLDOWN_MS = 2 * 60 * 1000;
const downUntil = new Map<string, number>();
const isCoolingDown = (name: string) => (downUntil.get(name) ?? 0) > Date.now();

type Call = (prompt: string, image: Image | undefined, deadline: number) => Promise<string>;

async function runChain(prompt: string, image?: Image): Promise<ChainResult> {
  const deadline = Date.now() + CHAIN_BUDGET_MS;
  const geminiKey = process.env.GEMINI_API_KEY;
  const all: { name: string; key: string | undefined; primary: boolean; call: Call }[] = [
    {
      name: geminiModel(),
      key: geminiKey,
      primary: true,
      call: (p, i, d) => geminiWithRetry(geminiModel(), p, i, d, PRIMARY_TIMEOUT_MS),
    },
    // Not retried: if this one is down too, move on to Groq quickly.
    {
      name: geminiBackupModel(),
      key: geminiBackupModel() ? geminiKey : undefined,
      primary: true,
      call: (p, i, d) => gemini(geminiBackupModel(), p, i, d, BACKUP_TIMEOUT_MS),
    },
    { name: "groq", key: process.env.GROQ_API_KEY, primary: false, call: groq },
  ];
  const providers = all.filter((p) => p.key);
  if (providers.length === 0) throw new AiError("no_keys", "No AI API keys are configured");

  // Healthy providers first, in order; ones cooling down are kept as a last resort.
  const ordered = [...providers.filter((p) => !isCoolingDown(p.name)), ...providers.filter((p) => isCoolingDown(p.name))];

  // Models occasionally emit slightly broken JSON; one fresh attempt usually fixes it.
  const callForJson = async (call: Call) => {
    try {
      return parseJson(await call(prompt, image, deadline));
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
      console.warn("[tatva] malformed JSON, asking the same model again");
      return parseJson(await call(prompt, image, deadline));
    }
  };

  let busy = false;
  for (const [i, p] of ordered.entries()) {
    try {
      const { result, legible } = normalizeResult(await callForJson(p.call));
      downUntil.delete(p.name);
      return { result: { ...result, provider: p.name }, legible, primary: p.primary };
    } catch (e) {
      const status = e instanceof ProviderError ? e.status : 0;
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      // Timeouts are overload too, so the user is told to retry shortly rather than "something went wrong".
      if (timedOut || status === 429 || status === 503 || status === 504) busy = true;
      if (timedOut || status === 429 || status === 503) downUntil.set(p.name, Date.now() + COOLDOWN_MS);
      const next = i < ordered.length - 1 ? "falling back" : "no providers left";
      console.warn(`[tatva] ${p.name} failed (${next}):`, e instanceof Error ? e.message : e);
    }
  }
  throw new AiError(busy ? "busy" : "failed", "All AI providers failed");
}

/** Step 1: read the medicines off the photo. */
export async function readPrescription(bytes: Buffer, mime: string) {
  const out = await runChain(READ_PROMPT, { base64: bytes.toString("base64"), mime });
  if (!out.primary) {
    out.result.fallback = true;
    for (const m of out.result.medicines) {
      for (const f of MED_FIELDS) m.confidence[f] = Math.min(m.confidence[f], FALLBACK_CONFIDENCE_CAP);
    }
  }
  return out;
}

/** Step 2: explain the confirmed medicines (text only, no image). */
export function getInsights(meds: EditableMedicine[], context: string) {
  return runChain(insightsPrompt(meds, context));
}
