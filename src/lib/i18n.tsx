"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Bi, Lang } from "./model";

const en = {
  tagline: "Understand your prescription",
  language: "Language",
  chooseLanguage: "Choose your language",
  chooseLanguageSub: "You can change this any time from the top bar.",

  scanTitle: "Scan a prescription",
  scanHint: "Lay the prescription flat in good light and keep all the writing inside the frame.",
  takePhoto: "Take photo",
  upload: "Upload from gallery",
  dropHint: "Photo of a handwritten or printed prescription",
  scanNow: "Scan prescription",
  chooseAnother: "Choose another",
  processing: "Reading your prescription…",
  processingSub: "This usually takes 5–20 seconds",
  privacy: "Your photo is only used to read the prescription and is never stored.",

  confirmTitle: "Check the medicines",
  confirmSub: "Fix anything that was read wrong. Orange fields were hard to read.",
  needsCheck: "fields need checking",
  unclear: "Unclear",
  writtenAs: "Written as",
  couldAlsoBe: "Could also be",
  backupTitle: "Read by the backup AI",
  backupNote:
    "The main AI was busy, so a less accurate backup read this prescription. Check every medicine against the paper, or scan again in a minute.",
  f_name: "Medicine name",
  f_strength: "Strength",
  f_dose: "Dose",
  f_frequency: "How often",
  f_timing: "When",
  f_food: "Food",
  f_duration: "For how long",
  food_before: "Before food",
  food_after: "After food",
  food_with: "With food",
  food_empty: "Empty stomach",
  food_any: "Any time",
  food_unknown: "Not specified",
  addMedicine: "Add medicine",
  remove: "Remove",
  continue: "Looks right, continue",
  updating: "Preparing your guide…",
  scanAgain: "Scan again",
  noMedicines: "No medicines found. Add them yourself or try a clearer photo.",

  nidana: "Nidana",
  nidanaSub: "Condition",
  aushadhi: "Aushadhi",
  aushadhiSub: "Medicines",
  aahara: "Aahara",
  aaharaSub: "Diet",
  vihara: "Vihara",
  viharaSub: "Lifestyle",

  verifyTitle: "Verify with your pharmacist",
  verifyNote:
    "This is an AI reading and can be wrong. Always check with your pharmacist or doctor before taking any medicine.",
  likelyConditions: "Likely conditions",
  conditionsNote: "Guessed from your medicines. This is not a diagnosis.",
  dailySchedule: "Daily schedule",
  asDirected: "As needed / as directed",
  slot_morning: "Morning",
  slot_afternoon: "Afternoon",
  slot_evening: "Evening",
  slot_night: "Night",
  yourMedicines: "Your medicines",
  whatFor: "What it's for",
  contains: "Contains",
  eat: "Good to eat",
  avoid: "Avoid or limit",
  interactions: "Food & medicine interactions",
  sev_low: "Low",
  sev_moderate: "Moderate",
  sev_high: "High",
  dailyHabits: "Daily habits",
  thingsToCheck: "Things to check",
  nothingHere: "Nothing to show here.",
  editMedicines: "Edit medicines",
  newScan: "New scan",

  err_generic: "Something went wrong. Please try again.",
  err_busy: "The reading service is busy right now. Please try again in a minute.",
  err_bad_image: "Please choose a photo (JPG, PNG or WebP) under 15 MB.",
  err_no_keys: "The server has no AI keys set up yet. Add them to .env and restart.",
  err_unreadable: "Couldn't read this prescription. Try a sharper, well-lit photo.",
};

export type Key = keyof typeof en;

const hi: Record<Key, string> = {
  tagline: "अपना पर्चा समझें",
  language: "भाषा",
  chooseLanguage: "अपनी भाषा चुनें",
  chooseLanguageSub: "आप इसे कभी भी ऊपर से बदल सकते हैं।",

  scanTitle: "पर्चा स्कैन करें",
  scanHint: "पर्चे को अच्छी रोशनी में सीधा रखें और पूरा लिखा हुआ फ़्रेम के अंदर रखें।",
  takePhoto: "फ़ोटो लें",
  upload: "गैलरी से चुनें",
  dropHint: "हाथ से लिखे या छपे पर्चे की फ़ोटो",
  scanNow: "पर्चा स्कैन करें",
  chooseAnother: "दूसरी फ़ोटो चुनें",
  processing: "आपका पर्चा पढ़ा जा रहा है…",
  processingSub: "इसमें आमतौर पर 5–20 सेकंड लगते हैं",
  privacy: "आपकी फ़ोटो सिर्फ़ पर्चा पढ़ने के लिए इस्तेमाल होती है और कभी सेव नहीं की जाती।",

  confirmTitle: "दवाइयाँ जाँचें",
  confirmSub: "जो गलत पढ़ा गया हो उसे ठीक करें। नारंगी हिस्से पढ़ने में मुश्किल थे।",
  needsCheck: "हिस्से जाँचने हैं",
  unclear: "साफ़ नहीं",
  writtenAs: "पर्चे पर लिखा",
  couldAlsoBe: "यह भी हो सकता है",
  backupTitle: "बैकअप AI ने पढ़ा",
  backupNote:
    "मुख्य AI व्यस्त था, इसलिए कम सटीक बैकअप AI ने यह पर्चा पढ़ा। हर दवा को पर्चे से मिलाकर जाँचें, या एक मिनट बाद फिर से स्कैन करें।",
  f_name: "दवा का नाम",
  f_strength: "स्ट्रेंथ",
  f_dose: "खुराक",
  f_frequency: "कितनी बार",
  f_timing: "कब",
  f_food: "भोजन",
  f_duration: "कितने दिन",
  food_before: "खाने से पहले",
  food_after: "खाने के बाद",
  food_with: "खाने के साथ",
  food_empty: "खाली पेट",
  food_any: "कभी भी",
  food_unknown: "नहीं लिखा",
  addMedicine: "दवा जोड़ें",
  remove: "हटाएँ",
  continue: "सही है, आगे बढ़ें",
  updating: "आपकी जानकारी तैयार हो रही है…",
  scanAgain: "फिर से स्कैन करें",
  noMedicines: "कोई दवा नहीं मिली। खुद जोड़ें या साफ़ फ़ोटो से फिर कोशिश करें।",

  nidana: "निदान",
  nidanaSub: "स्थिति",
  aushadhi: "औषधि",
  aushadhiSub: "दवाइयाँ",
  aahara: "आहार",
  aaharaSub: "खान-पान",
  vihara: "विहार",
  viharaSub: "जीवनशैली",

  verifyTitle: "अपने फ़ार्मासिस्ट से पुष्टि करें",
  verifyNote: "यह AI द्वारा पढ़ा गया है और गलत हो सकता है। कोई भी दवा लेने से पहले अपने फ़ार्मासिस्ट या डॉक्टर से ज़रूर पूछें।",
  likelyConditions: "संभावित स्थितियाँ",
  conditionsNote: "आपकी दवाइयों के आधार पर अनुमान। यह निदान नहीं है।",
  dailySchedule: "रोज़ का समय",
  asDirected: "ज़रूरत पड़ने पर / निर्देशानुसार",
  slot_morning: "सुबह",
  slot_afternoon: "दोपहर",
  slot_evening: "शाम",
  slot_night: "रात",
  yourMedicines: "आपकी दवाइयाँ",
  whatFor: "यह किस लिए है",
  contains: "इसमें है",
  eat: "क्या खाएँ",
  avoid: "क्या न खाएँ या कम खाएँ",
  interactions: "भोजन और दवा का असर",
  sev_low: "कम",
  sev_moderate: "मध्यम",
  sev_high: "ज़्यादा",
  dailyHabits: "रोज़ की आदतें",
  thingsToCheck: "जाँचने वाली बातें",
  nothingHere: "यहाँ दिखाने के लिए कुछ नहीं है।",
  editMedicines: "दवाइयाँ बदलें",
  newScan: "नया स्कैन",

  err_generic: "कुछ गलत हो गया। कृपया फिर से कोशिश करें।",
  err_busy: "पढ़ने वाली सेवा अभी व्यस्त है। एक मिनट बाद फिर कोशिश करें।",
  err_bad_image: "कृपया 15 MB से छोटी फ़ोटो (JPG, PNG या WebP) चुनें।",
  err_no_keys: "सर्वर पर अभी AI कुंजियाँ सेट नहीं हैं। उन्हें .env में जोड़कर फिर से शुरू करें।",
  err_unreadable: "यह पर्चा पढ़ा नहीं जा सका। साफ़ और अच्छी रोशनी वाली फ़ोटो लें।",
};

const dict: Record<Lang, Record<Key, string>> = { en, hi };
const STORAGE_KEY = "tatva:lang";

type LangContext = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** False until the user has picked a language on this device. */
  chosen: boolean;
  t: (key: Key) => string;
  /** Picks the current language from bilingual AI text. */
  tx: (text: Bi) => string;
};

const Ctx = createContext<LangContext | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  // Assume chosen until checked, so the picker doesn't flash during hydration.
  const [chosen, setChosen] = useState(true);

  // Read after mount because localStorage doesn't exist during server rendering.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (saved === "en" || saved === "hi") setLangState(saved);
    else setChosen(false);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setChosen(true);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = useMemo<LangContext>(
    () => ({
      lang,
      setLang,
      chosen,
      t: (key) => dict[lang][key],
      tx: (text) => text[lang] || text.en,
    }),
    [lang, setLang, chosen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
