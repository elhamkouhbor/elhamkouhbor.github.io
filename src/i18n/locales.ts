// The two languages of the site. English lives at / and Swedish at /sv/.
// Every page exists in both, and each links to the other (header switcher + hreflang).
export const langs = ["en", "sv"] as const;
export type Lang = (typeof langs)[number];

export interface LocaleMeta {
  /** BCP 47 tag for <html lang> and hreflang. */
  tag: string;
  /** Home page path for this language. */
  path: string;
  /** Name of the language in that language (switcher, aria-label). */
  name: string;
  /** Short switcher label. */
  short: string;
  ogLocale: string;
}

export const locales: Record<Lang, LocaleMeta> = {
  en: { tag: "en", path: "/", name: "English", short: "EN", ogLocale: "en_GB" },
  sv: { tag: "sv", path: "/sv/", name: "Svenska", short: "SV", ogLocale: "sv_SE" },
};
