"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, hashBlob, readCachedScan, writeCachedScan } from "@/lib/client";
import { useLang } from "@/lib/i18n";
import { editable, type Medicine, type ScanResult } from "@/lib/model";
import { ConfirmScreen } from "./ConfirmScreen";
import { Dashboard } from "./Dashboard";
import { Header, LanguagePicker } from "./Header";
import { ScanScreen } from "./ScanScreen";

type Step = "scan" | "processing" | "confirm" | "refining" | "dashboard";
type ErrorCode = "generic" | "busy" | "bad_image" | "no_keys" | "unreadable";

const ERROR_CODES: ErrorCode[] = ["generic", "busy", "bad_image", "no_keys", "unreadable"];
const SESSION_KEY = "tatva:session";
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

class ApiError extends Error {
  constructor(public code: ErrorCode) {
    super(code);
  }
}

async function callApi(url: string, init: RequestInit): Promise<ScanResult> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("generic");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(ERROR_CODES.includes(body?.error) ? body.error : "generic");
  return body as ScanResult;
}


export function TatvaApp() {
  const { chosen, t } = useLang();
  const [step, setStep] = useState<Step>("scan");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null); // what the AI read
  const [meds, setMeds] = useState<Medicine[]>([]); // the user's edited list
  const [final, setFinal] = useState<ScanResult | null>(null); // what the dashboard shows
  const [error, setError] = useState<ErrorCode | null>(null);
  const restored = useRef(false);
  // In-flight or finished insights request, keyed by the exact medicine list it was asked about.
  const insights = useRef<{ key: string; promise: Promise<ScanResult> } | null>(null);

  const requestInsights = (list: Medicine[], context: string) => {
    const body = JSON.stringify({ medicines: list.map(editable), context });
    if (insights.current?.key !== body) {
      const promise = callApi("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      promise.catch(() => {}); // awaited (and reported) when the user continues
      insights.current = { key: body, promise };
    }
    return insights.current.promise;
  };

  // Keep the current result across a refresh (results only; the photo is not kept).
  // Read after mount because sessionStorage doesn't exist during server rendering.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
      if (saved?.scan) {
        setScan(saved.scan);
        setMeds(saved.meds ?? saved.scan.medicines);
        setFinal(saved.final ?? null);
        setStep(saved.final ? "dashboard" : "confirm");
      }
    } catch {}
    restored.current = true;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!restored.current) return;
    try {
      if (scan) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ scan, meds, final }));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }, [scan, meds, final]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (f: File) => {
    setError(null);
    if (!f.type.startsWith("image/") || f.size > MAX_INPUT_BYTES) {
      setError("bad_image");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const runScan = async () => {
    if (!file) return;
    setError(null);
    setStep("processing");
    try {
      const hash = await hashBlob(file);
      let result = hash ? readCachedScan(hash) : null;
      if (!result) {
        let upload: Blob;
        try {
          upload = await compressImage(file);
        } catch {
          throw new ApiError("bad_image");
        }
        const form = new FormData();
        form.append("image", upload, "prescription.jpg");
        result = await callApi("/api/scan", { method: "POST", body: form });
        // Backup-model readings aren't cached, so scanning again can reach the main model.
        if (hash && !result.fallback) writeCachedScan(hash, result);
      }
      setScan(result);
      setMeds(result.medicines);
      setFinal(null);
      setStep("confirm");
      // Start explaining the medicines while the user checks them.
      if (result.medicines.length > 0) requestInsights(result.medicines, result.context);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "generic");
      setStep("scan");
    }
  };

  const confirm = async () => {
    if (!scan) return;
    const cleaned = meds.filter((m) => m.name.trim());

    setError(null);
    setStep("refining");
    try {
      // Reuses the prefetched answer when nothing was edited.
      const fresh = await requestInsights(cleaned, scan.context);
      // Keep exactly what the user confirmed; take descriptions and schedule from the AI.
      const merged = cleaned.map((m, i) => {
        const ai = fresh.medicines[i];
        return ai ? { ...m, generic: ai.generic || m.generic, description: ai.description, slots: ai.slots } : m;
      });
      setMeds(merged);
      setFinal({ ...fresh, medicines: merged, context: scan.context, fallback: scan.fallback });
      setStep("dashboard");
    } catch (e) {
      insights.current = null; // let the next tap try again
      setError(e instanceof ApiError ? e.code : "generic");
      setStep("confirm");
    }
  };

  const reset = () => {
    insights.current = null;
    setFile(null);
    setPreview(null);
    setScan(null);
    setMeds([]);
    setFinal(null);
    setError(null);
    setStep("scan");
  };

  const errorText = error ? t(`err_${error}`) : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-8 pt-5">
        {step === "scan" || step === "processing" ? (
          <ScanScreen
            preview={preview}
            processing={step === "processing"}
            error={errorText}
            onPick={pick}
            onScan={runScan}
          />
        ) : step === "dashboard" && final ? (
          <Dashboard
            result={final}
            onEdit={() => setStep("confirm")}
            onNewScan={reset}
          />
        ) : (
          <ConfirmScreen
            medicines={meds}
            fallback={!!scan?.fallback}
            busy={step === "refining"}
            error={errorText}
            onChange={setMeds}
            onConfirm={confirm}
            onRescan={reset}
          />
        )}
      </main>
      {!chosen && <LanguagePicker />}
    </>
  );
}
