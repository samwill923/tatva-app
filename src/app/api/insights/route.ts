// Step 2: confirmed medicines -> descriptions, conditions, diet, interactions, lifestyle.

import { NextResponse } from "next/server";
import { getInsights } from "@/lib/ai";
import { EDITABLE_FIELDS, FOODS, type EditableMedicine, type Food, type ScanResult } from "@/lib/model";
import { aiErrorResponse, cacheGet, cacheSet, errorResponse, sha256 } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function clean(v: unknown): EditableMedicine {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const fields = Object.fromEntries(
    EDITABLE_FIELDS.map((f) => [f, typeof o[f] === "string" ? (o[f] as string).trim().slice(0, 120) : ""]),
  ) as EditableMedicine;
  if (!FOODS.includes(fields.food as Food)) fields.food = "unknown";
  return fields;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.medicines) ? (body.medicines as unknown[]) : [];
  const medicines = raw.map(clean).filter((m) => m.name);
  const context = typeof body?.context === "string" ? body.context.slice(0, 300) : "";
  if (medicines.length === 0 || medicines.length > 20) return errorResponse("generic", 400);

  const key = `insights:${sha256(JSON.stringify({ medicines, context }))}`;
  const cached = cacheGet<ScanResult>(key);
  if (cached) return NextResponse.json(cached);

  try {
    const { result } = await getInsights(medicines, context);
    cacheSet(key, result);
    return NextResponse.json(result);
  } catch (e) {
    return aiErrorResponse(e);
  }
}
