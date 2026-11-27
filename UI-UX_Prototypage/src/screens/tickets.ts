/** Réservations (Figma « Reservations ») : billets avec QR code et suppression. */
import { isAuthenticated } from "../auth.ts";
import { mountScreen, openAuthGate, root, toast } from "../app.ts";
import { AppScreen, TopBar, chromeActions } from "../components/chrome.ts";
import { openMapSelector } from "../components/MapSelectorModal.ts";
import { openSheet } from "../components/Sheet.ts";
import { TicketCard, ticketQr } from "../components/TicketCard.ts";
import { navigate } from "../router.ts";
import { addTicket, getTickets, removeTicket } from "../store.ts";
import type { Ticket } from "../types.ts";
import { formatLongDate, parseDate } from "../utils/events.ts";
import { escapeHtml } from "../utils/html.ts";

function sortTickets(tickets: Ticket[]): Ticket[] {
  const time = (ticket: Ticket): number => parseDate(ticket.dateStart)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const now = Date.now() - 86_400_000;
  const upcoming = tickets.filter((ticket) => time(ticket) >= now).sort((a, b) => time(a) - time(b));
  const past = tickets.filter((ticket) => time(ticket) < now).sort((a, b) => time(b) - time(a));
  return [...upcoming, ...past];
}

function emptyState(): string {
  return isAuthenticated()
    ? `<div class="empty"><p class="h1">Aucune réservation</p><p class="body">Réserve une sortie pour obtenir ton billet et débloquer un Out.</p><button type="button" class="button button--primary button--label" data-action="explore">Explorer Paris</button></div>`
    : `<div class="empty"><p class="h1">Tes billets ici</p><p class="body">Connecte-toi pour réserver et retrouver tes QR codes.</p><button type="button" class="button button--primary button--label" data-action="login">Se connecter</button></div>`;
}

export function renderTickets(): void {
  const tickets = sortTickets(getTickets());
  mountScreen(
    AppScreen(
      `${TopBar("Réservations")}
      <ul class="feed feed--32" id="ticket-list" aria-label="Mes billets">
        ${tickets.length > 0 ? tickets.map((ticket) => `<li>${TicketCard(ticket)}</li>`).join("") : `<li>${emptyState()}</li>`}
      </ul>`,
      "tickets",
    ),
    {
      ...chromeActions(),
      explore: () => navigate("/home"),
      login: () => openAuthGate("/tickets"),
      "open-ticket": (target) => {
        const ticket = getTickets().find((item) => item.id === target.dataset.id);
        if (ticket) openTicket(ticket);
      },
      "delete-ticket": (target) => {
        const ticket = getTickets().find((item) => item.id === target.dataset.id);
        if (!ticket) return;
        removeTicket(ticket.id);
        const item = target.closest("li");
        item?.remove();
        const list = root.querySelector("#ticket-list");
        if (list && list.children.length === 0) list.innerHTML = `<li>${emptyState()}</li>`;
        toast("Billet supprimé", {
          action: {
            label: "Annuler",
            run: () => {
              addTicket(ticket);
              renderTickets();
            },
          },
        });
      },
    },
  );
}

function openTicket(ticket: Ticket): void {
  openSheet(
    "Mon billet",
    `<div class="stack stack--16 stack--center">
      <span class="qr qr--lg" role="img" aria-label="QR code à présenter à l’entrée">${ticketQr(ticket, "large")}</span>
      <p class="h1 center">${escapeHtml(ticket.eventTitle)}</p>
      <p class="caption lime center">${escapeHtml(formatLongDate(ticket.dateStart))}</p>
      <p class="body center">${ticket.quantity} billet${ticket.quantity > 1 ? "s" : ""} · ${escapeHtml(ticket.payment)}</p>
    </div>`,
    {
      footer: ticket.eventAddress
        ? `<button type="button" class="button button--primary button--block button--label" data-action="directions">S’y rendre</button>`
        : "",
      actions: {
        directions: () =>
          openMapSelector({
            addressName: ticket.eventAddress,
            latLon:
              ticket.latitude !== undefined && ticket.longitude !== undefined
                ? { lat: ticket.latitude, lon: ticket.longitude }
                : null,
          }),
      },
    },
  );
}
