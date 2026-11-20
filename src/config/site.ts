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
  url: "https://www.elhamkouhbor.com",
  locale: "en",
  title: "Elham Kouhbor — Digital Design & Visual Exploration",
  description:
    "Elham Kouhbor — digital design and visual exploration across image, line, layout and structural form. Form. Function. Feeling.",
  role: "Digital Design & Visual Exploration",
  tagline: ["Form.", "Function.", "Feeling."],
  ogImage: "/og.jpg",
  themeColor: "#282623",
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
  const out: { label: string; href: string; handle: string }[] = [];
  if (contact.github) out.push({ label: "GitHub", href: contact.github, handle: contact.github.replace(/^https?:\/\/(www\.)?/, "") });
  if (contact.email) out.push({ label: "Email", href: `mailto:${contact.email}`, handle: contact.email });
  if (contact.linkedin) out.push({ label: "LinkedIn", href: contact.linkedin, handle: contact.linkedin.replace(/^https?:\/\/(www\.)?/, "") });
  if (contact.instagram) out.push({ label: "Instagram", href: contact.instagram, handle: contact.instagram.replace(/^https?:\/\/(www\.)?/, "") });
  if (contact.behance) out.push({ label: "Behance", href: contact.behance, handle: contact.behance.replace(/^https?:\/\/(www\.)?/, "") });
  return out;
}

export const chapters = [
  { id: "arrival", n: "01", title: "Arrival" },
  { id: "studies", n: "02", title: "Form & Expression" },
  { id: "flat-to-form", n: "03", title: "Flat to Form" },
  { id: "disciplines", n: "04", title: "Disciplines" },
  { id: "philosophy", n: "05", title: "Philosophy" },
  { id: "contact", n: "06", title: "Contact" },
] as const;
