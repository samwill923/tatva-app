"use client";

import { useState, type ReactNode } from "react";
import { useLang, type Key } from "@/lib/i18n";
import { MED_FIELDS, SLOTS, isLow, type Bi, type Medicine, type ScanResult, type Severity, type Slot } from "@/lib/model";
import { Alert, Bowl, Check, Cross, Pill, Pulse, Sun } from "./icons";
import { Card, SectionTitle, UnclearBadge } from "./ui";

type Tab = "nidana" | "aushadhi" | "aahara" | "vihara";

const TABS: { id: Tab; icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "nidana", icon: Pulse },
  { id: "aushadhi", icon: Pill },
  { id: "aahara", icon: Bowl },
  { id: "vihara", icon: Sun },
];

const SLOT_EMOJI: Record<Slot, string> = { morning: "🌅", afternoon: "☀️", evening: "🌇", night: "🌙" };

const SEVERITY_STYLE: Record<Severity, string> = {
  low: "bg-sage-light text-sage-dark",
  moderate: "bg-sunset-light text-sunset-dark",
  high: "bg-red-100 text-red-800",
};

type Props = { result: ScanResult; onEdit: () => void; onNewScan: () => void };

export function Dashboard({ result, onEdit, onNewScan }: Props) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("aushadhi");

  const counts: Record<Tab, number> = {
    nidana: result.conditions.length,
    aushadhi: result.medicines.length,
    aahara: result.diet.include.length + result.diet.avoid.length + result.interactions.length,
    vihara: result.lifestyle.length,
  };
  const flagged: Record<Tab, boolean> = {
    nidana: result.conditions.some((c) => isLow(c.confidence)),
    aushadhi: result.medicines.some((m) => MED_FIELDS.some((f) => isLow(m.confidence[f]))),
    aahara: result.interactions.some((i) => i.severity === "high"),
    vihara: false,
  };

  return (
    <section>
      <VerifyNote warnings={result.warnings} />

      <div role="tablist" className="mt-4 grid grid-cols-2 gap-3">
        {TABS.map(({ id, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`relative rounded-2xl p-4 text-left transition active:scale-[.98] ${
                active ? "bg-sage text-white shadow-md" : "border border-sage/10 bg-white text-ink shadow-sm"
              }`}
            >
              {flagged[id] && (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-sunset ring-2 ring-white" aria-hidden />
              )}
              <Icon className={`h-6 w-6 ${active ? "text-white" : "text-sage"}`} />
              <p className="mt-2 text-lg font-bold leading-tight">{t(id)}</p>
              <p className={`text-xs ${active ? "text-white/80" : "text-muted"}`}>
                {t(`${id}Sub` as Key)} · {counts[id]}
              </p>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-6">
        {tab === "nidana" && <Nidana result={result} />}
        {tab === "aushadhi" && <Aushadhi medicines={result.medicines} />}
        {tab === "aahara" && <Aahara result={result} />}
        {tab === "vihara" && <BiList items={result.lifestyle} title={t("dailyHabits")} />}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <button type="button" onClick={onEdit} className="btn-secondary">
          {t("editMedicines")}
        </button>
        <button type="button" onClick={onNewScan} className="btn-primary">
          {t("newScan")}
        </button>
      </div>
    </section>
  );
}

function VerifyNote({ warnings }: { warnings: Bi[] }) {
  const { t, tx } = useLang();
  return (
    <div className="rounded-2xl border border-sunset/30 bg-sunset-light p-4">
      <p className="flex items-center gap-2 font-bold text-sunset-dark">
        <Alert className="h-5 w-5" /> {t("verifyTitle")}
      </p>
      <p className="mt-1 text-sm text-ink/80">{t("verifyNote")}</p>
      {warnings.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
          {warnings.map((w, i) => (
            <li key={i}>{tx(w)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty() {
  const { t } = useLang();
  return <p className="rounded-2xl bg-white p-4 text-sm text-muted">{t("nothingHere")}</p>;
}

function Nidana({ result }: { result: ScanResult }) {
  const { t, tx } = useLang();
  return (
    <>
      <SectionTitle>{t("likelyConditions")}</SectionTitle>
      <p className="mb-3 text-xs text-muted">{t("conditionsNote")}</p>
      {result.conditions.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid gap-3">
          {result.conditions.map((c, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-bold text-ink">{tx(c.name)}</p>
                {isLow(c.confidence) && <UnclearBadge label={t("unclear")} />}
              </div>
              {c.note.en && <p className="mt-1 text-sm text-muted">{tx(c.note)}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Aushadhi({ medicines }: { medicines: Medicine[] }) {
  const { t } = useLang();
  if (medicines.length === 0) return <Empty />;

  const groups = SLOTS.map((slot) => ({ slot, meds: medicines.filter((m) => m.slots.includes(slot)) })).filter(
    (g) => g.meds.length > 0,
  );
  const asDirected = medicines.filter((m) => m.slots.length === 0);

  return (
    <>
      <SectionTitle>{t("dailySchedule")}</SectionTitle>
      <Card className="divide-y divide-sage/10 p-0">
        {groups.map(({ slot, meds }) => (
          <ScheduleRow key={slot} emoji={SLOT_EMOJI[slot]} label={t(`slot_${slot}`)} meds={meds} />
        ))}
        {asDirected.length > 0 && <ScheduleRow emoji="📋" label={t("asDirected")} meds={asDirected} />}
      </Card>

      <SectionTitle>{t("yourMedicines")}</SectionTitle>
      <div className="grid gap-3">
        {medicines.map((m) => (
          <MedicineCard key={m.id} m={m} />
        ))}
      </div>
    </>
  );
}

function ScheduleRow({ emoji, label, meds }: { emoji: string; label: string; meds: Medicine[] }) {
  const { t } = useLang();
  return (
    <div className="flex gap-3 p-4">
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{label}</p>
        <ul className="mt-1 space-y-1">
          {meds.map((m) => (
            <li key={m.id} className="text-sm text-ink/80">
              <span className="font-semibold text-sage">{m.name}</span>
              {m.strength && ` ${m.strength}`}
              {m.dose && ` · ${m.dose}`}
              {m.food !== "unknown" && <span className="text-muted"> · {t(`food_${m.food}`)}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MedicineCard({ m }: { m: Medicine }) {
  const { t, tx } = useLang();
  const details: { label: string; value: string; low: boolean }[] = [
    { label: t("f_dose"), value: m.dose, low: isLow(m.confidence.dose) },
    { label: t("f_frequency"), value: m.frequency, low: isLow(m.confidence.frequency) },
    { label: t("f_timing"), value: m.timing, low: isLow(m.confidence.timing) },
    { label: t("f_food"), value: m.food === "unknown" ? "" : t(`food_${m.food}`), low: isLow(m.confidence.food) },
    { label: t("f_duration"), value: m.duration, low: false },
  ].filter((d) => d.value || d.low);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold leading-tight text-ink">
            {m.name} {m.strength && <span className="font-semibold text-sage">{m.strength}</span>}
          </p>
          {m.generic && (
            <p className="text-xs text-muted">
              {t("contains")}: {m.generic}
            </p>
          )}
        </div>
        {(isLow(m.confidence.name) || isLow(m.confidence.strength)) && <UnclearBadge label={t("unclear")} />}
      </div>
      {m.writtenAs && (
        <p className="mt-1 text-xs text-muted">
          {t("writtenAs")}: <span className="font-mono">{m.writtenAs}</span>
        </p>
      )}

      {m.description.en && (
        <div className="mt-3 rounded-xl bg-sage-light/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-sage">{t("whatFor")}</p>
          <p className="mt-0.5 text-sm text-ink">{tx(m.description)}</p>
        </div>
      )}

      {details.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          {details.map((d) => (
            <div key={d.label}>
              <dt className="text-xs text-muted">{d.label}</dt>
              <dd className={d.low ? "font-semibold text-sunset-dark" : "text-ink"}>
                {d.value || "—"}
                {d.low && <span className="ml-1 text-[11px]">⚠ {t("unclear")}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

function Aahara({ result }: { result: ScanResult }) {
  const { t, tx } = useLang();
  return (
    <>
      <BiList items={result.diet.include} title={t("eat")} icon={<Check className="h-4 w-4 text-sage" />} />
      <BiList items={result.diet.avoid} title={t("avoid")} icon={<Cross className="h-4 w-4 text-sunset" />} />

      <SectionTitle>{t("interactions")}</SectionTitle>
      {result.interactions.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid gap-3">
          {result.interactions.map((x, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-ink">
                  {x.medicine} <span className="text-muted">+</span> {x.with}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_STYLE[x.severity]}`}>
                  {t(`sev_${x.severity}`)}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/80">{tx(x.effect)}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function BiList({ items, title, icon }: { items: Bi[]; title: string; icon?: ReactNode }) {
  const { tx } = useLang();
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-sage/10">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3 px-4 py-3 text-sm text-ink">
                <span className="mt-0.5 shrink-0">{icon ?? <span className="block h-2 w-2 translate-y-1.5 rounded-full bg-sage" />}</span>
                <span>{tx(item)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
