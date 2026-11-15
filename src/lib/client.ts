// Browser-side helpers: image compression, hashing and the local result cache.

import type { ScanResult } from "./model";

const MAX_SIDE = 1600;
const QUALITY = 0.85;

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // Applies EXIF orientation so phone photos aren't sideways.
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // fall back to <img>
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

/** Downscales to a JPEG that is small enough to upload but still sharp enough to read. */
export async function compressImage(file: Blob): Promise<Blob> {
  const img = await decode(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encoding failed"))), "image/jpeg", QUALITY),
    );
  } finally {
    img.release();
  }
}

/** SHA-256 of the original file. Null where Web Crypto isn't available (plain-http LAN testing). */
export async function hashBlob(blob: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Results (never images) of recent scans, so re-scanning the same photo skips the API.
// Bumped when the result shape changes, so older saved results are ignored (v4: alternatives).
const PREFIX = "tatva:scan:v4:";
const INDEX = "tatva:scan-index:v4";
const MAX_CACHED = 10;

export function readCachedScan(hash: string): ScanResult | null {
  try {
    const raw = localStorage.getItem(PREFIX + hash);
    return raw ? (JSON.parse(raw) as ScanResult) : null;
  } catch {
    return null;
  }
}

export function writeCachedScan(hash: string, result: ScanResult) {
  try {
    const index = (JSON.parse(localStorage.getItem(INDEX) ?? "[]") as string[]).filter((h) => h !== hash);
    index.push(hash);
    while (index.length > MAX_CACHED) localStorage.removeItem(PREFIX + index.shift());
    localStorage.setItem(INDEX, JSON.stringify(index));
    localStorage.setItem(PREFIX + hash, JSON.stringify(result));
  } catch {
    // storage full or blocked: caching is best-effort
  }
}
