// The three languages of the site. English lives at /, Swedish at /sv/ and Farsi (right to left) at /fa/.
// Every page exists in all three, and each links to the other two (header switcher + hreflang).
export const langs = ["en", "sv", "fa"] as const;
export type Lang = (typeof langs)[number];

export interface LocaleMeta {
  /** BCP 47 tag for <html lang> and hreflang. */
  tag: string;
  dir: "ltr" | "rtl";
  /** Home page path for this language. */
  path: string;
  /** Name of the language in that language (switcher, aria-label). */
  name: string;
  /** Short switcher label. */
  short: string;
  ogLocale: string;
  /** Outward arrow for links that leave the page (points along the reading direction). */
  out: string;
}

export const locales: Record<Lang, LocaleMeta> = {
  en: { tag: "en", dir: "ltr", path: "/", name: "English", short: "EN", ogLocale: "en_GB", out: "↗" },
  sv: { tag: "sv", dir: "ltr", path: "/sv/", name: "Svenska", short: "SV", ogLocale: "sv_SE", out: "↗" },
  fa: { tag: "fa", dir: "rtl", path: "/fa/", name: "فارسی", short: "فا", ogLocale: "fa_IR", out: "↖" },
};

/** Numbers in the script of the language (Persian digits in Farsi). */
export function num(lang: Lang, n: number | string): string {
  const s = String(n);
  return lang === "fa" ? s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]) : s;
}
