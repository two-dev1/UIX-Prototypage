import { renderSVG } from "uqr";
import type { Ticket } from "../types.ts";
import { parseDate } from "../utils/events.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";
import { fallbackImage, img } from "../utils/images.ts";

const qrCache = new Map<string, string>();

/** QR code réel (contenu : identifiant du billet), couleur lime sur fond transparent. */
export function ticketQr(ticket: Ticket, variant: "card" | "large" = "card"): string {
  const key = `${ticket.id}-${variant}`;
  const cached = qrCache.get(key);
  if (cached) return cached;
  const svg = renderSVG(`OUT75:${ticket.id}:${ticket.eventId}:x${ticket.quantity}`, {
    border: variant === "large" ? 1 : 0,
    blackColor: variant === "large" ? "#151515" : "#B8E62E",
    whiteColor: variant === "large" ? "#FEFEFE" : "transparent",
  });
  qrCache.set(key, svg);
  return svg;
}

/** Carte « Ticket » : visuel masqué, nom, QR lime, quantité et suppression. */
export function TicketCard(ticket: Ticket): string {
  const id = escapeHtml(ticket.id);
  const date = parseDate(ticket.dateStart);
  const past = date !== null && date.getTime() < Date.now() - 86_400_000;
  const fallback = fallbackImage(ticket.category, 480);
  return `<article class="ticket${past ? " is-past" : ""}" data-id="${id}">
    <button type="button" class="ticket__main" data-action="open-ticket" data-id="${id}" aria-label="Afficher le billet ${escapeHtml(ticket.eventTitle)}">
      <span class="media media--ticket">${img(ticket.coverUrl || fallback, ticket.eventTitle, { fallback, width: 240, height: 124 })}</span>
      <span class="h1 ticket__name"><span>${escapeHtml(ticket.eventTitle)}</span></span>
    </button>
    <div class="ticket__side">
      <span class="qr" role="img" aria-label="QR code du billet">${ticketQr(ticket)}</span>
      <div class="ticket__actions">
        <button type="button" class="icon-button ticket__delete" data-action="delete-ticket" data-id="${id}" aria-label="Supprimer ce billet">${icon("cross")}</button>
        <span class="badge" aria-label="${ticket.quantity} billet${ticket.quantity > 1 ? "s" : ""}">x${ticket.quantity}</span>
      </div>
    </div>
  </article>`;
}
