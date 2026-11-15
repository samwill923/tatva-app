"use client";

import { useLang } from "@/lib/i18n";
import type { Lang } from "@/lib/model";
import { FullLogo, Logo } from "./icons";

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "hi", label: "हिं" },
];

export function Header() {
  const { lang, setLang, t } = useLang();
  return (
    <header className="sticky top-0 z-20 border-b border-sage/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Logo className="h-10 w-10" />
          <div>
            <p className="text-xl font-bold leading-none tracking-tight text-sage">Tatva</p>
            <p className="mt-0.5 text-xs text-muted">{t("tagline")}</p>
          </div>
        </div>
        <div role="group" aria-label={t("language")} className="flex rounded-full bg-sage/10 p-1 text-sm font-semibold">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              className={`rounded-full px-3 py-1 transition ${lang === l.id ? "bg-sage text-white shadow-sm" : "text-sage"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export function LanguagePicker() {
  const { setLang } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-3xl bg-cream p-6 shadow-2xl">
        <FullLogo className="mx-auto h-36 w-auto rounded-2xl" />
        <h2 className="mt-4 text-center text-xl font-bold text-ink">
          Choose your language
          <span className="mt-1 block text-lg">अपनी भाषा चुनें</span>
        </h2>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => setLang("en")}
            className="rounded-2xl bg-sage px-4 py-4 text-lg font-semibold text-white transition active:scale-[.98]"
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang("hi")}
            className="rounded-2xl bg-sunset px-4 py-4 text-lg font-semibold text-white transition active:scale-[.98]"
          >
            हिन्दी
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          You can change this any time · आप इसे कभी भी बदल सकते हैं
        </p>
      </div>
    </div>
  );
}
