import labelsEn from "@/assets/labels.en.json";
import labelsEs from "@/assets/labels.es.json";
import labelsFr from "@/assets/labels.fr.json";
import labelsPt from "@/assets/labels.pt.json";
import type { Locale, LocaleLabels } from "./types/labels";

export const SUPPORTED_LOCALES: readonly Locale[] = ["es", "en", "fr", "pt"];

export const DEFAULT_LOCALE: Locale = "en";

const LABELS_BY_LOCALE: Record<Locale, LocaleLabels> = {
  es: labelsEs as LocaleLabels,
  en: labelsEn as LocaleLabels,
  fr: labelsFr as LocaleLabels,
  pt: labelsPt as LocaleLabels,
};

/** Maps browser language codes (e.g. "es-MX", "en-US") to a supported locale. */
export function resolveLocaleFromBrowserLang(lang: string): Locale | null {
  const code = lang.toLowerCase().split("-")[0];
  if (code === "es") return "es";
  if (code === "en") return "en";
  if (code === "fr") return "fr";
  if (code === "pt") return "pt";
  return null;
}

/**
 * Reads `navigator.languages` / `navigator.language` and returns the first
 * supported locale, or English if none match.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const candidates =
    navigator.languages?.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const lang of candidates) {
    const resolved = resolveLocaleFromBrowserLang(lang);
    if (resolved) return resolved;
  }

  return DEFAULT_LOCALE;
}

export function getLabels(locale: Locale): LocaleLabels {
  return LABELS_BY_LOCALE[locale];
}

export function getNextLocale(current: Locale): Locale {
  const index = SUPPORTED_LOCALES.indexOf(current);
  return SUPPORTED_LOCALES[(index + 1) % SUPPORTED_LOCALES.length];
}
