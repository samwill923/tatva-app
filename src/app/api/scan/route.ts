// Step 1: photo -> medicines. Explanations come from /api/insights.

import { NextResponse } from "next/server";
import { readPrescription } from "@/lib/ai";
import type { ScanResult } from "@/lib/model";
import { aiErrorResponse, cacheGet, cacheSet, errorResponse, sha256 } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// The client compresses before upload; this stays under Vercel's 4.5 MB body limit.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  let file: File | null = null;
  try {
    const entry = (await req.formData()).get("image");
    if (entry instanceof File) file = entry;
  } catch {
    // fall through to bad_image
  }
  if (!file || !TYPES.has(file.type) || file.size === 0 || file.size > MAX_BYTES) {
    return errorResponse("bad_image", 400);
  }

  // The image only lives in memory for this request; it is never written anywhere.
  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `scan:v4:${sha256(bytes)}`;

  const cached = cacheGet<ScanResult>(key);
  if (cached) return NextResponse.json(cached);

  try {
    const { result, legible } = await readPrescription(bytes, file.type);
    if (!legible && result.medicines.length === 0) return errorResponse("unreadable", 422);
    // Don't cache backup-model readings, so scanning again gets another chance at the main model.
    if (!result.fallback) cacheSet(key, result);
    return NextResponse.json(result);
  } catch (e) {
    return aiErrorResponse(e);
  }
}
