import type { EventSlot, ParisEvent } from "../types.ts";
import type { MapLocationData } from "./maps.ts";
import { asText } from "./html.ts";

const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" });

/** Catégories proposées dans l'app (valeurs présentes dans `qfap_tags`). */
export const CATEGORIES = [
  { id: "Concert", label: "Concerts" },
  { id: "Expo", label: "Expositions" },
  { id: "Théâtre", label: "Théâtre" },
  { id: "Cinéma", label: "Cinéma" },
  { id: "Sport", label: "Sport" },
  { id: "Danse", label: "Danse" },
  { id: "Atelier", label: "Ateliers" },
  { id: "Enfants", label: "Enfants" },
] as const;

/** Convertit le HTML éventuel de l'API en texte brut (sans exécuter de script). */
export function toPlainText(value: string | null | undefined): string {
  const raw = asText(value);
  if (!raw) return "";
  const withSpaces = raw.replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|li|h[1-6])>/gi, " ");
  const fragment = new DOMParser().parseFromString(withSpaces, "text/html");
  return (fragment.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function parseDate(value: string | null | undefined): Date | null {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/** « 12 nov./14 déc. » — format compact du titre de carte (« title date/date »). */
export function formatDateRange(event: ParisEvent): string {
  const start = parseDate(event.date_start);
  const end = parseDate(event.date_end);
  if (start && end && !isSameDay(start, end))
    return `${shortDate.format(start)} / ${shortDate.format(end)}`;
  const single = start ?? end;
  if (single) return shortDate.format(single);
  return truncate(toPlainText(event.date_description), 60);
}

export function formatLongDate(value: string | null): string {
  const date = parseDate(value);
  return date ? longDate.format(date) : "Date non précisée";
}

/** Libellé court du prix (chip lime de la carte). */
export function formatPrice(event: ParisEvent): { label: string; free: boolean } {
  const type = asText(event.price_type).toLowerCase();
  if (type === "gratuit") return { label: "Gratuit", free: true };
  const detail = toPlainText(event.price_detail);
  const amounts = [...detail.matchAll(/(\d+(?:[.,]\d+)?)\s?€/g)].map((match) =>
    Number(match[1].replace(",", ".")),
  );
  const max = Math.max(0, ...amounts.filter((value) => Number.isFinite(value)));
  if (max > 0) return { label: `${priceFormat(max)}€`, free: false };
  if (type.includes("payant")) return { label: "Payant", free: false };
  return { label: type ? capitalize(type) : "Tarif ?", free: false };
}

export function getEventSlot(dateStart: string | null): EventSlot | "" {
  const date = parseDate(dateStart);
  if (!date) return "";
  const hour = date.getHours();
  if (hour < 12) return "Matin";
  if (hour < 18) return "Journée";
  return "Soir";
}

export function getEventAddress(event: ParisEvent): string {
  return [event.address_name, event.address_street, event.address_zipcode, event.address_city]
    .map((part) => asText(part))
    .filter((part) => part.length > 0)
    .join(" ");
}

export function getEventLocation(event: ParisEvent): MapLocationData {
  return {
    latLon: event.lat_lon,
    addressName: event.address_name,
    addressStreet: event.address_street,
    addressZipcode: event.address_zipcode,
    addressCity: event.address_city,
  };
}

/** Catégorie d'Out (sticker) débloquée par une réservation. */
export function inferCategory(event: ParisEvent): string {
  const tags = Array.isArray(event.qfap_tags) ? event.qfap_tags.join(";") : asText(event.qfap_tags);
  const text = `${tags} ${asText(event.title)} ${asText(event.lead_text)}`.toLowerCase();
  if (text.includes("concert") || text.includes("musique")) return "Concert";
  if (text.includes("expo") || text.includes("musée") || text.includes("galerie")) return "Exposition";
  if (text.includes("ciné") || text.includes("film")) return "Cinéma";
  if (text.includes("théâtre") || text.includes("spectacle")) return "Théâtre";
  if (text.includes("sport") || text.includes("course") || text.includes("run")) return "Sport";
  if (text.includes("soir") || text.includes("club") || text.includes("danse")) return "Soirée";
  return "Gratuit";
}

/** Nombre de likes stable dérivé de l'identifiant (l'API ne fournit pas de likes). */
export function baseLikes(id: string): number {
  return 12 + (id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 80);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

/** 24.3 → « 24,30 », 12 → « 12 ». */
function priceFormat(value: number): string {
  const decimals = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}
