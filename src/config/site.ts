// Central site configuration. Edit here — every component reads from this file.
//
// CONTACT DETAILS: only verified links belong here. A field left as `null` is simply not rendered
// (no empty buttons, no placeholder links). Add e.g. `email: "name@example.com"` once confirmed.

export interface ContactLinks {
  github: string | null;
  email: string | null;
  linkedin: string | null;
  instagram: string | null;
  behance: string | null;
}

export const site = {
  name: "Elham Kouhbor",
  /** Production URL (canonical, sitemap, social cards). */
  url: "https://www.elhamkouhbor.com",
  role: "Digital Designer",
  // Page titles and descriptions are per language: src/content/content.ts (copy[lang].site).
  ogImage: "/og.jpg",
  themeColor: "#F1E2D2",
} as const;

export const contact: ContactLinks = {
  github: "https://github.com/elhamkouhbor",
  email: null,
  linkedin: null,
  instagram: null,
  behance: null,
};

/** Rendered contact links, in display order; null entries are skipped. */
export function contactLinks(): { label: string; href: string; handle: string }[] {
  const strip = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "");
  const out: { label: string; href: string; handle: string }[] = [];
  if (contact.github) out.push({ label: "GitHub", href: contact.github, handle: strip(contact.github) });
  if (contact.email) out.push({ label: "Email", href: `mailto:${contact.email}`, handle: contact.email });
  if (contact.linkedin) out.push({ label: "LinkedIn", href: contact.linkedin, handle: strip(contact.linkedin) });
  if (contact.instagram) out.push({ label: "Instagram", href: contact.instagram, handle: strip(contact.instagram) });
  if (contact.behance) out.push({ label: "Behance", href: contact.behance, handle: strip(contact.behance) });
  return out;
}

/** In-page navigation. Labels are per language (copy[lang].ui.nav). */
export const nav = ["work", "practice"] as const;
