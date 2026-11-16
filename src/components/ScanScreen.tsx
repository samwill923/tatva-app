"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, type Key } from "@/lib/i18n";
import { Camera, Check, ImageIcon, Lock, Spinner } from "./icons";
import { ErrorBanner } from "./ui";

type Props = {
  preview: string | null;
  processing: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onScan: () => void;
};

const TIPS: Key[] = ["tipFlat", "tipLight", "tipPage"];
const STEPS: Key[] = ["stepPhoto", "stepReading", "stepChecking"];

export function ScanScreen({ preview, processing, error, onPick, onScan }: Props) {
  const { t } = useLang();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (file) onPick(file);
  };

  return (
    <section>
      <h1 className="px-1 font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink">{t("scanTitle")}</h1>
      <p className="mt-1 px-1 text-sm text-muted">{t("scanHint")}</p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={handle} />

      {preview ? (
        <div className="glass-strong relative mt-5 overflow-hidden rounded-[28px] p-2">
          <div className="relative overflow-hidden rounded-[22px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={preview} alt="" className="mx-auto max-h-[58vh] w-full object-contain" />
            {processing && (
              <div className="pointer-events-none absolute inset-0 bg-white/15">
                <div className="sweep absolute inset-x-3" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="viewfinder glass relative mt-5 flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-[28px] text-sage transition hover:bg-white/65"
        >
          <span className="vf-b" aria-hidden />
          <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-pastel/70 text-sage-dark">
            <Camera className="h-9 w-9" />
          </span>
          <span className="max-w-[16rem] px-6 text-center text-sm text-muted">{t("dropHint")}</span>
        </button>
      )}

      {!preview && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {TIPS.map((k) => (
            <span key={k} className="chip">
              <Check className="h-3.5 w-3.5 text-sage" />
              {t(k)}
            </span>
          ))}
        </div>
      )}

      {error && <ErrorBanner className="mt-4">{error}</ErrorBanner>}

      <div className="mt-5 grid gap-3">
        {processing ? (
          <Progress />
        ) : preview ? (
          <>
            <button type="button" onClick={onScan} className="btn-primary">
              {t("scanNow")}
            </button>
            <button type="button" onClick={() => galleryRef.current?.click()} className="btn-secondary">
              {t("chooseAnother")}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => cameraRef.current?.click()} className="btn-primary">
              <Camera className="h-5 w-5" /> {t("takePhoto")}
            </button>
            <button type="button" onClick={() => galleryRef.current?.click()} className="btn-secondary">
              <ImageIcon className="h-5 w-5" /> {t("upload")}
            </button>
          </>
        )}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 px-4 text-center text-xs text-muted">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        {t("privacy")}
      </p>
    </section>
  );
}

/** Step list while the AI reads the photo. The steps advance on a timer; it's a guide, not a live status. */
function Progress() {
  const { t } = useLang();
  const [active, setActive] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setActive(2), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="glass-strong rounded-3xl p-4" aria-live="polite">
      <p className="font-display font-extrabold text-ink">{t("processing")}</p>
      <p className="text-xs text-muted">{t("processingSub")}</p>
      <ol className="mt-3 grid gap-2.5">
        {STEPS.map((k, i) => {
          const done = i < active;
          const now = i === active;
          return (
            <li key={k} className={`flex items-center gap-3 text-sm ${done || now ? "text-ink" : "text-muted/70"}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  done ? "bg-pastel text-sage-dark" : now ? "bg-sage-light text-sage" : "border border-sage/20"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : now ? <Spinner className="h-3.5 w-3.5" /> : null}
              </span>
              <span className={now ? "font-semibold" : ""}>{t(k)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
