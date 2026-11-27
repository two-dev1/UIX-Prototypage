import type { ParisEvent } from "../types.ts";
import { inferCategory } from "./events.ts";
import { asText, escapeHtml } from "./html.ts";

const unsplash = (id: string, width = 720): string =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=70&auto=format&fit=crop`;

/** Visuels Unsplash de repli, choisis par catégorie d'Out. */
const FALLBACKS: Record<string, string> = {
  Concert: "1501386761578-eac5c94b800a",
  Exposition: "1554907984-15263bfd63bd",
  Cinéma: "1489599849927-2ee91cede3ba",
  Théâtre: "1503095396549-807759245b35",
  Sport: "1461896836934-ffe607ba8211",
  Soirée: "1514525253161-7a46d19cd819",
  Gratuit: "1502602898657-3e91760cbb34",
  Paris: "1502602898657-3e91760cbb34",
  Danse: "1508700929628-666bc8bd84ea",
  Atelier: "1531058020387-3be344556be6",
  Enfants: "1531058020387-3be344556be6",
  Expo: "1554907984-15263bfd63bd",
};

/** Photos de soirées, concerts et foules (remplissage du grand « 75 »). */
const PARTY_PHOTOS = [
  "1501386761578-eac5c94b800a",
  "1514525253161-7a46d19cd819",
  "1470229722913-7c0e2dbbafd3",
  "1459749411175-04bf5292ceea",
  "1492684223066-81342ee5ff30",
  "1533174072545-7a4b6ad7a6c3",
  "1516450360452-9312f5e86fc7",
  "1429962714451-bb934ecdc4ec",
];

export function randomPartyImage(width = 900): string {
  return unsplash(PARTY_PHOTOS[Math.floor(Math.random() * PARTY_PHOTOS.length)], width);
}

export function fallbackImage(category = "Paris", width?: number): string {
  return unsplash(FALLBACKS[category] ?? FALLBACKS.Paris, width);
}

export function eventImage(event: ParisEvent): { src: string; fallback: string; alt: string } {
  const fallback = fallbackImage(inferCategory(event));
  const src = asText(event.cover_url);
  return {
    src: /^https?:\/\//.test(src) ? src : fallback,
    fallback,
    alt: asText(event.cover_alt) || asText(event.title) || "Visuel de l’événement",
  };
}

/** Image paresseuse avec repli automatique (géré par délégation dans app.ts). */
export function img(
  src: string,
  alt: string,
  options: { fallback?: string; width?: number; height?: number; eager?: boolean } = {},
): string {
  const { fallback, width = 360, height = 193, eager = false } = options;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async"${fallback ? ` data-fallback="${escapeHtml(fallback)}"` : ""}>`;
}
