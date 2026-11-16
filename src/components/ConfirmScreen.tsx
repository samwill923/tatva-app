"use client";

import { useLang, type Key } from "@/lib/i18n";
import { FOODS, MED_FIELDS, blankMedicine, isLow, type Food, type MedField, type Medicine } from "@/lib/model";
import { Alert, Plus, Spinner, Trash } from "./icons";
import { ErrorBanner } from "./ui";

type Props = {
  medicines: Medicine[];
  fallback: boolean;
  busy: boolean;
  error: string | null;
  onChange: (meds: Medicine[]) => void;
  onConfirm: () => void;
  onRescan: () => void;
};

type TextField = "name" | "strength" | "dose" | "frequency" | "timing" | "duration";
const DETAIL_FIELDS: TextField[] = ["strength", "dose", "frequency", "timing", "duration"];

export function ConfirmScreen({ medicines, fallback, busy, error, onChange, onConfirm, onRescan }: Props) {
  const { t } = useLang();

  const update = (id: string, field: TextField | "food", value: string) =>
    onChange(
      medicines.map((m) =>
        m.id !== id
          ? m
          : {
              ...m,
              [field]: value,
              // An edited field is now user-verified.
              confidence: (MED_FIELDS as string[]).includes(field) ? { ...m.confidence, [field]: 1 } : m.confidence,
            },
      ),
    );

  // Picking a suggested reading swaps it with the current name, so the user can switch back.
  const pickAlternative = (m: Medicine, alt: string) =>
    onChange(
      medicines.map((x) =>
        x.id !== m.id
          ? x
          : {
              ...x,
              name: alt,
              alternatives: (x.alternatives ?? []).map((a) => (a === alt ? x.name : a)),
              confidence: { ...x.confidence, name: 1 },
            },
      ),
    );

  const unclearCount = medicines.reduce((n, m) => n + MED_FIELDS.filter((f) => isLow(m.confidence[f])).length, 0);
  const canContinue = medicines.some((m) => m.name.trim());

  return (
    <section>
      <h1 className="px-1 font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink">{t("confirmTitle")}</h1>
      <p className="mt-1 px-1 text-sm text-muted">{t("confirmSub")}</p>
      {fallback && (
        <div role="alert" className="mt-4 rounded-3xl border border-sunset/30 bg-sunset-light/85 p-4 backdrop-blur-xl">
          <p className="flex items-center gap-2 font-bold text-sunset-dark">
            <Alert className="h-5 w-5" /> {t("backupTitle")}
          </p>
          <p className="mt-1 text-sm text-ink/80">{t("backupNote")}</p>
        </div>
      )}
      {unclearCount > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sunset/25 bg-sunset-light/85 px-3 py-1 text-xs font-semibold text-sunset-dark">
          <Alert className="h-3.5 w-3.5" />
          {unclearCount} {t("needsCheck")}
        </p>
      )}

      <fieldset disabled={busy} className="mt-5 grid gap-4">
        {medicines.length === 0 && <p className="glass rounded-3xl p-4 text-sm text-muted">{t("noMedicines")}</p>}

        {medicines.map((m, i) => (
          <div key={m.id} className="glass-strong rounded-3xl p-4">
            <div className="flex items-end gap-2">
              <span className="mb-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pastel text-sm font-bold text-sage-dark">
                {i + 1}
              </span>
              <Field
                className="flex-1"
                label={t("f_name")}
                value={m.name}
                low={isLow(m.confidence.name)}
                big
                onChange={(v) => update(m.id, "name", v)}
              />
              <button
                type="button"
                onClick={() => onChange(medicines.filter((x) => x.id !== m.id))}
                aria-label={`${t("remove")} ${m.name}`}
                className="mb-1 rounded-xl p-2.5 text-muted transition hover:bg-red-50 hover:text-red-700"
              >
                <Trash className="h-5 w-5" />
              </button>
            </div>
            {m.writtenAs && (
              <p className="ml-9 mt-2 rounded-lg bg-white/60 px-2.5 py-1.5 text-xs text-muted">
                {t("writtenAs")}: <span className="font-mono text-ink">{m.writtenAs}</span>
              </p>
            )}
            {(m.alternatives ?? []).length > 0 && (
              <div className="ml-9 mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted">{t("couldAlsoBe")}:</span>
                {m.alternatives.map((alt) => (
                  <button
                    key={alt}
                    type="button"
                    onClick={() => pickAlternative(m, alt)}
                    className="rounded-full border border-sunset/40 bg-sunset-light px-2.5 py-1 font-semibold text-sunset-dark transition active:scale-95"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              {DETAIL_FIELDS.map((f) => (
                <Field
                  key={f}
                  label={t(`f_${f}` as Key)}
                  value={m[f]}
                  low={f !== "duration" && isLow(m.confidence[f as MedField])}
                  onChange={(v) => update(m.id, f, v)}
                />
              ))}
              <label className="block">
                <FieldLabel label={t("f_food")} low={isLow(m.confidence.food)} />
                <select
                  value={m.food}
                  onChange={(e) => update(m.id, "food", e.target.value as Food)}
                  className={`input pr-1 text-sm ${isLow(m.confidence.food) ? "input-low" : ""}`}
                >
                  {FOODS.map((f) => (
                    <option key={f} value={f}>
                      {t(`food_${f}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...medicines, blankMedicine()])}
          className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sage/25 bg-white/30 py-3 font-semibold text-sage transition hover:bg-white/55"
        >
          <Plus className="h-5 w-5" /> {t("addMedicine")}
        </button>
      </fieldset>

      {error && <ErrorBanner className="mt-4">{error}</ErrorBanner>}

      <div className="sticky bottom-0 -mx-4 mt-6 grid gap-2 bg-gradient-to-t from-cream via-cream/90 to-transparent px-4 pb-4 pt-6">
        <button type="button" onClick={onConfirm} disabled={busy || !canContinue} className="btn-primary">
          {busy ? (
            <>
              <Spinner /> {t("updating")}
            </>
          ) : (
            t("continue")
          )}
        </button>
        <button type="button" onClick={onRescan} disabled={busy} className="py-2 text-sm font-semibold text-muted">
          {t("scanAgain")}
        </button>
      </div>
    </section>
  );
}

function FieldLabel({ label, low }: { label: string; low: boolean }) {
  const { t } = useLang();
  return (
    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
      {label}
      {low && <span className="font-semibold text-sunset-dark">• {t("unclear")}</span>}
    </span>
  );
}

function Field({
  label,
  value,
  low,
  big,
  className = "",
  onChange,
}: {
  label: string;
  value: string;
  low: boolean;
  big?: boolean;
  className?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={`block ${className}`}>
      <FieldLabel label={label} low={low} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input ${big ? "text-lg font-semibold" : ""} ${low ? "input-low" : ""}`}
      />
    </label>
  );
}
