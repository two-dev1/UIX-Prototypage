/** Détail événement (Figma « Detail ») + réservation, QR et sticker débloqué. */
import { getEventById } from "../api.ts";
import { mountScreen, requireAuth, root, toast } from "../app.ts";
import { AppScreen, TopBar, chromeActions } from "../components/chrome.ts";
import { EventCard, EventCardSkeleton } from "../components/EventCard.ts";
import { eventCache, eventCardActions } from "../components/eventActions.ts";
import { openMapSelector } from "../components/MapSelectorModal.ts";
import { openSheet } from "../components/Sheet.ts";
import { openStickerPopup } from "../components/Sticker.ts";
import { navigate } from "../router.ts";
import {
  addOut,
  addScore,
  addTicket,
  getFavorites,
  getFollowedOrganizers,
  getLikedEvents,
  toggleFollowedOrganizer,
} from "../store.ts";
import type { ParisEvent, Ticket } from "../types.ts";
import {
  formatLongDate,
  formatPrice,
  getEventAddress,
  getEventLocation,
  inferCategory,
  toPlainText,
} from "../utils/events.ts";
import { asText, escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";
import { eventImage } from "../utils/images.ts";
import { createMapLinks } from "../utils/maps.ts";

export function renderEventDetail(id: string): void {
  const cached = eventCache.get(id);
  const signal = mountScreen(
    AppScreen(
      `${TopBar(asText(cached?.title) || "Événement", { left: "back" })}<div class="stack stack--32" id="detail">${cached ? "" : EventCardSkeleton()}</div>`,
      null,
    ),
    {
      ...chromeActions(),
      ...eventCardActions(),
      reserve: () => {
        const event = eventCache.get(id);
        if (event && requireAuth()) openReservation(event);
      },
      directions: () => {
        const event = eventCache.get(id);
        if (event) openMapSelector(getEventLocation(event));
      },
      follow: (target) => {
        const event = eventCache.get(id);
        if (!event || !requireAuth()) return;
        const organizer = asText(event.address_name) || "Organisateur Paris";
        const followed = toggleFollowedOrganizer(organizer);
        target.textContent = followed ? "Lieu suivi" : "Suivre le lieu";
        target.setAttribute("aria-pressed", String(followed));
      },
      retry: () => renderEventDetail(id),
    },
  );

  if (cached) {
    fill(cached);
    return;
  }
  const controller = new AbortController();
  signal.addEventListener("abort", () => controller.abort());
  getEventById(id, controller.signal)
    .then((event) => {
      if (signal.aborted) return;
      if (!event) return showError("Événement introuvable.");
      eventCache.set(id, event);
      const title = root.querySelector(".topbar__title span");
      if (title) title.textContent = asText(event.title) || "Événement";
      fill(event);
    })
    .catch((error: unknown) => {
      if (!signal.aborted) showError(error instanceof Error ? error.message : "Erreur de chargement.");
    });
}

function showError(message: string): void {
  const host = root.querySelector("#detail");
  if (host)
    host.innerHTML = `<div class="empty"><p class="body">${escapeHtml(message)}</p><button type="button" class="button button--primary button--label" data-action="retry">Réessayer</button></div>`;
}

function fill(event: ParisEvent): void {
  const host = root.querySelector("#detail");
  if (!host) return;
  const id = asText(event.id);
  const address = getEventAddress(event);
  const description = toPlainText(event.description) || toPlainText(event.lead_text) || "Description bientôt disponible.";
  const organizer = asText(event.address_name) || "Organisateur Paris";
  const followed = getFollowedOrganizers().includes(organizer);
  const url = asText(event.url);
  host.innerHTML = `
    ${EventCard(event, { static: true, saved: getFavorites().includes(id), liked: getLikedEvents().includes(id), eager: true })}
    <button type="button" class="button button--primary button--block" data-action="reserve">Réserver</button>
    <div class="stack stack--16">
      <p class="caption lime">${escapeHtml(event.date_start ? formatLongDate(event.date_start) : toPlainText(event.date_description) || "Dates à venir")}</p>
      <p class="body">${escapeHtml(description)}</p>
    </div>
    <div class="stack stack--12">
      ${
        address
          ? `<button type="button" class="button button--dark button--block button--label" data-action="directions">${icon("location")} S’y rendre · ${escapeHtml(asText(event.address_name) || "Itinéraire")}</button>`
          : `<p class="caption muted">Adresse non communiquée</p>`
      }
      <button type="button" class="button button--outline button--block button--label" data-action="follow" aria-pressed="${followed}">${followed ? "Lieu suivi" : "Suivre le lieu"}</button>
      ${/^https?:\/\//.test(url) ? `<a class="link link--underline self-center" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Voir la fiche sur paris.fr</a>` : ""}
    </div>`;
}

/** Feuille de réservation : quantité + moyen de paiement (simulé). */
function openReservation(event: ParisEvent): void {
  let quantity = 1;
  const price = formatPrice(event);
  const payments = price.free ? ["Gratuit"] : ["Apple Pay", "Carte bancaire"];
  let payment = payments[0];
  const sheet = openSheet(
    "Réserver",
    `<p class="h1">${escapeHtml(asText(event.title) || "Événement")}</p>
     <div class="stepper">
       <span class="h2">Billets</span>
       <span class="stepper__controls">
         <button type="button" class="stepper__button" data-action="qty" data-delta="-1" aria-label="Retirer un billet">−</button>
         <output data-qty aria-live="polite">1</output>
         <button type="button" class="stepper__button" data-action="qty" data-delta="1" aria-label="Ajouter un billet">+</button>
       </span>
     </div>
     <div class="stack stack--8">
       <span class="h2">Paiement</span>
       <div class="segmented">${payments
         .map((item, index) => `<button type="button" class="chip${index === 0 ? " is-active" : ""}" data-action="pay" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`)
         .join("")}</div>
     </div>
     <p class="caption muted">Tarif : ${escapeHtml(price.label)} · paiement simulé, aucun débit réel.</p>`,
    {
      footer: `<button type="button" class="button button--primary button--block" data-action="confirm">Confirmer</button>`,
      actions: {
        qty: (target) => {
          quantity = Math.min(8, Math.max(1, quantity + Number(target.dataset.delta)));
          const output = sheet.element.querySelector("[data-qty]");
          if (output) output.textContent = String(quantity);
        },
        pay: (target) => {
          payment = target.dataset.value ?? payment;
          sheet.element.querySelectorAll("[data-action='pay']").forEach((chip) => chip.classList.toggle("is-active", chip === target));
        },
        confirm: () => {
          const category = inferCategory(event);
          const links = createMapLinks(getEventLocation(event));
          const ticket: Ticket = {
            id: `ticket-${Date.now()}`,
            eventId: asText(event.id),
            eventTitle: asText(event.title) || "Événement Paris",
            eventAddress: getEventAddress(event),
            coverUrl: eventImage(event).src,
            latitude: links.latitude ?? undefined,
            longitude: links.longitude ?? undefined,
            dateStart: event.date_start,
            quantity,
            payment,
            purchasedAt: new Date().toISOString(),
            category,
          };
          addTicket(ticket);
          const isNew = addOut(category);
          addScore(100);
          sheet.close();
          openStickerPopup(category, () => {
            toast(isNew ? "Sticker ajouté à ta collection" : "Billet ajouté à tes réservations");
            navigate("/tickets");
          });
        },
      },
    },
  );
}
