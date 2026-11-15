"use client";

import { useRef } from "react";
import { useLang } from "@/lib/i18n";
import { Camera, ImageIcon, Spinner } from "./icons";
import { ErrorBanner } from "./ui";

type Props = {
  preview: string | null;
  processing: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onScan: () => void;
};

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
      <h1 className="text-2xl font-bold text-ink">{t("scanTitle")}</h1>
      <p className="mt-1 text-sm text-muted">{t("scanHint")}</p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={handle} />

      {preview ? (
        <div className="relative mt-5 overflow-hidden rounded-3xl border border-sage/15 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={preview} alt="" className="mx-auto max-h-[60vh] w-full object-contain" />
          {processing && (
            <div className="pointer-events-none absolute inset-0">
              <div className="scan-grid absolute inset-0 bg-sage/10" />
              <div className="laser absolute inset-x-0" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="mt-5 flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-sage/30 bg-sage-light/50 text-sage transition hover:bg-sage-light"
        >
          <span className="rounded-full bg-white p-5 shadow-sm">
            <Camera className="h-10 w-10" />
          </span>
          <span className="px-8 text-center text-sm text-muted">{t("dropHint")}</span>
        </button>
      )}

      {error && <ErrorBanner className="mt-4">{error}</ErrorBanner>}

      <div className="mt-5 grid gap-3">
        {processing ? (
          <div className="flex flex-col items-center gap-1 py-2 text-center" aria-live="polite">
            <p className="flex items-center gap-2 font-semibold text-sage">
              <Spinner /> {t("processing")}
            </p>
            <p className="text-xs text-muted">{t("processingSub")}</p>
          </div>
        ) : preview ? (
          <>
            <button type="button" onClick={onScan} className="btn-primary bg-sunset">
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

      <p className="mt-6 text-center text-xs text-muted">🔒 {t("privacy")}</p>
    </section>
  );
}
