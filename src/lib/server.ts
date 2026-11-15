// Server-side helpers for the API routes: result cache and error responses.

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { AiError } from "./ai";

export type ApiErrorCode = "generic" | "busy" | "bad_image" | "no_keys" | "unreadable";

export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");

// In-memory cache of results (never images), keyed by content hash.
// Lives per server instance: on Vercel each warm function keeps its own copy.
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;
const store = new Map<string, { at: number; value: unknown }>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  store.delete(key);
  if (Date.now() - hit.at > TTL_MS) return undefined;
  store.set(key, hit); // refresh LRU position
  return structuredClone(hit.value) as T;
}

export function cacheSet(key: string, value: unknown) {
  store.set(key, { at: Date.now(), value: structuredClone(value) });
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value!);
}

export const errorResponse = (code: ApiErrorCode, status: number) => NextResponse.json({ error: code }, { status });

export function aiErrorResponse(e: unknown) {
  if (e instanceof AiError) {
    if (e.code === "no_keys") return errorResponse("no_keys", 500);
    if (e.code === "busy") return errorResponse("busy", 503);
  } else {
    console.error("[tatva] unexpected error:", e);
  }
  return errorResponse("generic", 502);
}
