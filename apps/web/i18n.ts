import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// Define supported locales
export const LOCALES = ["en", "es", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

// Determine if a locale is valid
export function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === "string" && LOCALES.includes(locale as Locale);
}

export default getRequestConfig(async ({ locale }) => {
  if (!isValidLocale(locale)) {
    notFound();
  }

  try {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return { locale, messages };
  } catch (err) {
    console.error(`i18n: failed to load messages for locale '${locale}':`, err);
    // Attempt a safe fallback to English if available
    if (locale !== "en") {
      try {
        const fallback = (await import(`./messages/en.json`)).default;
        return { locale: "en", messages: fallback };
      } catch (fallbackErr) {
        console.error("i18n: failed to load fallback 'en' messages:", fallbackErr);
      }
    }

    // If all else fails, return 404 to avoid crashing the app
    notFound();
  }
});
