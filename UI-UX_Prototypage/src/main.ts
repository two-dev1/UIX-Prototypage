import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/utilities.css";

import { getEventsPage } from "./api.ts";
import {
  isAuthenticated,
  loginUser,
  logoutUser,
  registerUser,
} from "./auth.ts";
import { BottomNav, type BottomTab } from "./components/BottomNav.ts";
import { EventCard, getEventSlot } from "./components/EventCard.ts";
import { Modal } from "./components/Modal.ts";
import { QuickAuthModal } from "./components/QuickAuthModal.ts";
import {
  bindMapSelectorCopy,
  MapSelectorModal,
} from "./components/MapSelectorModal.ts";
import { mockCommunityPosts } from "./data/mockCommunity.ts";
import { navigate, readRoute, type AppRoute } from "./router.ts";
import {
  addOut,
  addScore,
  addTicket,
  getCurrentUser,
  getFavorites,
  getFollowedOrganizers,
  getOuts,
  getPosts,
  getScore,
  getTickets,
  readStorage,
  setPosts,
  toggleFavorite,
  toggleFollowedOrganizer,
  writeStorage,
} from "./store.ts";
import type {
  CommunityComment,
  CommunityPost,
  ParisEvent,
  Ticket,
} from "./types.ts";
import { isHtmlElement, requireElement } from "./utils/dom.ts";
import { asText, escapeHtml } from "./utils/html.ts";
import { createMapLinks, type MapLocationData } from "./utils/maps.ts";

const app = requireElement(document, "#app", isHtmlElement);

let events: ParisEvent[] = [];
let eventCache = new Map<string, ParisEvent>();
let totalCount = 0;
let offset = 0;
let isLoading = false;
let searchTimer: number | undefined;
let searchValue = "";
let freeOnly = false;
let slotFilter = "";
let arrondissement = "";
let category = "";
let currentRoute: AppRoute = readRoute();
let observer: IntersectionObserver | undefined;
let activeRequest: AbortController | undefined;
let requestVersion = 0;

void boot();

async function boot(): Promise<void> {
  if (!window.location.hash) {
    const onboardingDone = readStorage<boolean>("outrs-onboarding-done", false);
    navigate(onboardingDone ? "/home" : "/welcome");
  }
  window.addEventListener("hashchange", () => {
    currentRoute = readRoute();
    observer?.disconnect();
    renderRoute();
  });
  renderRoute();
}

function renderRoute(): void {
  currentRoute = readRoute();
  if (currentRoute.type === "welcome") {
    renderWelcome();
    return;
  }
  if (currentRoute.type === "auth") {
    renderAuth(currentRoute.mode);
    return;
  }
  if (currentRoute.type === "event") {
    void renderEventDetail(currentRoute.id);
    return;
  }
  if (currentRoute.type === "share") {
    renderShare(currentRoute.postId);
    return;
  }
  if (currentRoute.type === "tickets") {
    renderTickets("À venir");
    return;
  }
  if (currentRoute.type === "community") {
    renderCommunity();
    return;
  }
  if (currentRoute.type === "profile") {
    renderProfile();
    return;
  }
  renderHome();
}

function shell(content: string, active: BottomTab | "none"): string {
  return `<main class="app-shell">${content}</main>${active === "none" ? "" : BottomNav(active)}`;
}

function renderWelcome(): void {
  app.innerHTML = `
    <main class="welcome">
      <p class="welcome__kicker">OUT75</p>
      <h1>HELLO</h1>
      <p>Découvre Paris, rencontre des gens et débloque tes Outers.</p>
      <button type="button" class="button button--primary" data-welcome-start>Commencer</button>
      <button type="button" class="button button--text" data-welcome-guest>Continuer en tant qu’invité</button>
    </main>
  `;
  const start = app.querySelector("[data-welcome-start]");
  if (start instanceof HTMLButtonElement)
    start.addEventListener("click", () => navigate("/auth/login"));
  const guest = app.querySelector("[data-welcome-guest]");
  if (guest instanceof HTMLButtonElement)
    guest.addEventListener("click", () => {
      writeStorage("outrs-onboarding-done", true);
      navigate("/home");
    });
}

function renderAuth(initialMode: "login" | "register"): void {
  let mode = initialMode;
  const draw = (): void => {
    app.innerHTML = `
      <main class="auth">
        <button type="button" class="button button--text" data-auth-back>← Retour</button>
        <h1>${mode === "login" ? "Connexion" : "Inscription"}</h1>
        <div class="auth__switch">
          <button type="button" class="button${mode === "login" ? " button--primary" : ""}" data-auth-mode="login">Connexion</button>
          <button type="button" class="button${mode === "register" ? " button--primary" : ""}" data-auth-mode="register">Inscription</button>
        </div>
        <form class="auth__form" id="auth-form">
          ${mode === "register" ? `<label>Nom d’utilisateur<input name="name" autocomplete="nickname" required></label>` : ""}
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Mot de passe<input name="password" type="password" minlength="4" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required></label>
          <button type="submit" class="button button--primary">${mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
        </form>
        <div class="auth__social">
          <button type="button" class="button" data-social="Google">Continuer avec Google</button>
          <button type="button" class="button" data-social="Apple">Continuer avec Apple</button>
          <button type="button" class="button" data-social="Facebook">Continuer avec Facebook</button>
        </div>
      </main>
    `;

    app
      .querySelectorAll<HTMLButtonElement>("[data-auth-mode]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          mode = button.dataset.authMode === "register" ? "register" : "login";
          draw();
        });
      });
    const back = app.querySelector("[data-auth-back]");
    if (back instanceof HTMLButtonElement)
      back.addEventListener("click", () => navigate("/welcome"));
    const form = app.querySelector("#auth-form");
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const email = asText(String(data.get("email") ?? ""));
        const name = asText(String(data.get("name") ?? ""));
        if (mode === "register") registerUser(name || "Camille", email);
        else loginUser(email);
        navigate("/home");
      });
    }
    app
      .querySelectorAll<HTMLButtonElement>("[data-social]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          loginUser(
            `camille.${(button.dataset.social ?? "social").toLowerCase()}@outlook.fr`,
          );
          navigate("/home");
        });
      });
  };
  draw();
}

function renderHome(): void {
  app.innerHTML = shell(
    `
    <header class="home-header">
      <div>
        <p class="header__kicker">OUT75</p>
        <h1>VIENS ON SORS<br>DANS PARIS ?</h1>
      </div>
      <button type="button" class="icon-button" id="search-toggle" aria-label="Ouvrir la recherche">⌕</button>
    </header>
    <section id="search-panel" class="search-panel" hidden>
      <label class="visually-hidden" for="event-search">Rechercher un événement</label>
      <input id="event-search" type="search" value="${escapeHtml(searchValue)}" placeholder="Titre ou mot-clé">
    </section>
    <div class="filter-pills">
      <button type="button" class="pill${freeOnly ? " is-active" : ""}" data-free-only>Gratuit uniquement</button>
      <button type="button" class="pill${slotFilter === "Matin/Journée" ? " is-active" : ""}" data-slot="Matin/Journée">Matin / Journée</button>
      <button type="button" class="pill${slotFilter === "Soir" ? " is-active" : ""}" data-slot="Soir">Soir</button>
      <button type="button" class="pill" data-open-filter>Filtres</button>
    </div>
    <p class="count" id="event-count">Chargement…</p>
    <ul class="grid" id="event-grid"></ul>
    <p class="status" id="event-status" aria-live="polite"></p>
    <div id="event-sentinel" aria-hidden="true"></div>
  `,
    "home",
  );

  bindBottomNav();
  const searchToggle = app.querySelector("#search-toggle");
  const searchPanel = app.querySelector("#search-panel");
  const searchInput = app.querySelector("#event-search");
  if (
    searchToggle instanceof HTMLButtonElement &&
    searchPanel instanceof HTMLElement
  ) {
    searchToggle.addEventListener("click", () => {
      searchPanel.hidden = !searchPanel.hidden;
      if (!searchPanel.hidden && searchInput instanceof HTMLInputElement)
        searchInput.focus();
    });
  }
  if (searchInput instanceof HTMLInputElement) {
    searchInput.addEventListener("input", () => {
      searchValue = searchInput.value;
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => void resetAndLoadEvents(), 300);
    });
  }
  const free = app.querySelector("[data-free-only]");
  if (free instanceof HTMLButtonElement)
    free.addEventListener("click", () => {
      freeOnly = !freeOnly;
      free.classList.toggle("is-active", freeOnly);
      void resetAndLoadEvents();
    });
  app.querySelectorAll<HTMLButtonElement>("[data-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.slot ?? "";
      slotFilter = slotFilter === value ? "" : value;
      app.querySelectorAll<HTMLButtonElement>("[data-slot]").forEach((slot) => {
        slot.classList.toggle("is-active", slot.dataset.slot === slotFilter);
      });
      void resetAndLoadEvents();
    });
  });
  const filter = app.querySelector("[data-open-filter]");
  if (filter instanceof HTMLButtonElement)
    filter.addEventListener("click", openFiltersModal);

  void loadEventPage();
}

async function resetAndLoadEvents(): Promise<void> {
  requestVersion++;
  activeRequest?.abort();
  activeRequest = undefined;
  observer?.disconnect();
  events = [];
  eventCache = new Map<string, ParisEvent>();
  offset = 0;
  totalCount = 0;
  isLoading = false;

  const grid = app.querySelector("#event-grid");
  if (grid instanceof HTMLElement) grid.innerHTML = "";
  const count = app.querySelector("#event-count");
  if (count instanceof HTMLElement) count.textContent = "Chargement…";
  const status = app.querySelector("#event-status");
  if (status instanceof HTMLElement) status.textContent = "";

  await loadEventPage();
}

async function loadEventPage(): Promise<void> {
  if (isLoading || (totalCount > 0 && offset >= totalCount) || offset >= 200) {
    updateEventStatus();
    return;
  }

  isLoading = true;
  const version = requestVersion;
  const controller = new AbortController();
  activeRequest?.abort();
  activeRequest = controller;

  const status = app.querySelector("#event-status");
  if (status instanceof HTMLElement) status.textContent = "Chargement…";

  try {
    const page = await getEventsPage({
      limit: 20,
      offset,
      search: searchValue,
      freeOnly,
      arrondissement,
      category,
      signal: controller.signal,
    });

    if (version !== requestVersion || controller.signal.aborted) return;

    totalCount = page.totalCount;
    let next = page.results;
    if (slotFilter === "Matin/Journée")
      next = next.filter((event) =>
        ["Matin", "Journée"].includes(getEventSlot(event.date_start)),
      );
    if (slotFilter === "Soir")
      next = next.filter((event) => getEventSlot(event.date_start) === "Soir");

    events = [...events, ...next];
    next.forEach((event) => eventCache.set(asText(event.id), event));
    if (page.results.length === 0) totalCount = offset;
    offset += page.results.length;
    renderEventGrid();
  } catch (error: unknown) {
    if (version !== requestVersion || controller.signal.aborted) return;
    if (status instanceof HTMLElement)
      status.textContent =
        error instanceof Error ? error.message : "Erreur de chargement.";
  } finally {
    if (version === requestVersion) {
      isLoading = false;
      activeRequest = undefined;
      updateEventStatus();
      setupSentinel();
    }
  }
}

function renderEventGrid(): void {
  const grid = app.querySelector("#event-grid");
  const count = app.querySelector("#event-count");
  if (grid instanceof HTMLElement) {
    const favorites = getFavorites();
    grid.innerHTML = events
      .map(
        (event) =>
          `<li>${EventCard(event, { saved: favorites.includes(asText(event.id)) })}</li>`,
      )
      .join("");
    bindEventActions(grid);
  }
  if (count instanceof HTMLElement)
    count.textContent = `${events.length} événement${events.length > 1 ? "s" : ""}`;
}

function updateEventStatus(): void {
  const status = app.querySelector("#event-status");
  if (!(status instanceof HTMLElement)) return;
  if (totalCount > 0 && events.length >= totalCount)
    status.textContent = "Vous avez tout vu !";
  else if (offset >= 200) status.textContent = "Vous avez tout vu !";
  else if (!isLoading)
    status.textContent = events.length === 0 ? "Aucun événement" : "";
}

function setupSentinel(): void {
  const sentinel = app.querySelector("#event-sentinel");
  if (
    !(sentinel instanceof HTMLElement) ||
    typeof IntersectionObserver === "undefined"
  )
    return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadEventPage();
    },
    { rootMargin: "300px" },
  );
  observer.observe(sentinel);
}

function bindEventActions(root: ParentNode): void {
  root
    .querySelectorAll<HTMLButtonElement>("[data-event-open]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        navigate(
          `/event/${encodeURIComponent(button.dataset.eventOpen ?? "")}`,
        ),
      );
    });
  root
    .querySelectorAll<HTMLButtonElement>("[data-bookmark]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        if (!requireAuth()) return;
        const id = button.dataset.bookmark ?? "";
        toggleFavorite(id);
        renderEventGrid();
      });
    });
  root
    .querySelectorAll<HTMLButtonElement>("[data-event-like]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        if (!requireAuth()) return;
        button.textContent = "♥ 1";
      });
    });
}

function openFiltersModal(): void {
  const options = [
    "75001",
    "75002",
    "75003",
    "75004",
    "75005",
    "75006",
    "75007",
    "75008",
    "75009",
    "75010",
    "75011",
    "75012",
    "75013",
    "75014",
    "75015",
    "75016",
    "75017",
    "75018",
    "75019",
    "75020",
  ];
  const categories = [
    "Concerts",
    "Expos",
    "Théâtre",
    "Cinéma",
    "Sport",
    "Soirées",
  ];
  showModal(
    Modal(
      "Filtres",
      `
    <label>Arrondissement<select id="filter-arrondissement"><option value="">Tous</option>${options.map((value) => `<option${arrondissement === value ? " selected" : ""} value="${value}">${value}</option>`).join("")}</select></label>
    <label>Catégorie<select id="filter-category"><option value="">Toutes</option>${categories.map((value) => `<option${category === value ? " selected" : ""} value="${value}">${value}</option>`).join("")}</select></label>
    <button type="button" class="button button--primary" id="apply-filters">Appliquer</button>
  `,
    ),
  );
  const apply = document.querySelector("#apply-filters");
  if (apply instanceof HTMLButtonElement)
    apply.addEventListener("click", () => {
      const district = document.querySelector("#filter-arrondissement");
      const categorySelect = document.querySelector("#filter-category");
      arrondissement =
        district instanceof HTMLSelectElement ? district.value : "";
      category =
        categorySelect instanceof HTMLSelectElement ? categorySelect.value : "";
      closeModal();
      void resetAndLoadEvents();
    });
}

async function renderEventDetail(id: string): Promise<void> {
  let event = eventCache.get(id);
  if (!event) {
    try {
      const page = await getEventsPage({ limit: 200, offset: 0 });
      event = page.results.find((item) => asText(item.id) === id);
      if (event) eventCache.set(id, event);
    } catch {
      event = undefined;
    }
  }

  if (!event) {
    app.innerHTML = shell(
      `<button type="button" class="button" data-go-home>← Retour</button><p class="status">Événement introuvable.</p>`,
      "none",
    );
    bindBackHome();
    return;
  }

  const title = asText(event.title) || "Événement sans titre";
  const address = getEventAddress(event);
  const description =
    asText(event.description) ||
    asText(event.lead_text) ||
    "Description bientôt disponible.";
  const saved = getFavorites().includes(id);
  app.innerHTML = `<main class="event-detail">
    <button type="button" class="button button--text" data-go-home>← Retour</button>
    <div class="event-detail__media">${event.cover_url ? `<img src="${escapeHtml(asText(event.cover_url))}" alt="${escapeHtml(asText(event.cover_alt) || title)}">` : `<div class="card__fallback">Image indisponible</div>`}</div>
    <div class="event-detail__body">
      <button type="button" class="card__bookmark${saved ? " is-active" : ""}" data-detail-bookmark>★</button>
      <p class="card__slot">${escapeHtml(getEventSlot(event.date_start))}</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(formatDate(event.date_start))}</p>
      ${address ? `<button type="button" class="address-link" data-open-map><span aria-hidden="true">⌖</span> S’y rendre · ${escapeHtml(address)}</button>` : `<p>Adresse non communiquée</p>`}
      <p>${escapeHtml(formatPrice(event.price_type))}</p>
      <div class="event-detail__actions">
        <button type="button" class="button" data-share>Partager</button>
        <button type="button" class="button" data-follow>Suivre l’organisateur</button>
      </div>
      <p class="event-detail__description">${escapeHtml(stripHtml(description))}</p>
      <button type="button" class="button button--primary event-detail__reserve" data-reserve>Réserver</button>
    </div>
  </main>`;

  bindBackHome();
  const openMap = app.querySelector("[data-open-map]");
  if (openMap instanceof HTMLButtonElement)
    openMap.addEventListener("click", () =>
      openMapSelector(getEventLocation(event)),
    );
  const bookmark = app.querySelector("[data-detail-bookmark]");
  if (bookmark instanceof HTMLButtonElement)
    bookmark.addEventListener("click", () => {
      if (!requireAuth()) return;
      toggleFavorite(id);
      bookmark.classList.toggle("is-active");
    });
  const share = app.querySelector("[data-share]");
  if (share instanceof HTMLButtonElement)
    share.addEventListener("click", () => void shareEvent(event));
  const follow = app.querySelector("[data-follow]");
  if (follow instanceof HTMLButtonElement)
    follow.addEventListener("click", () => {
      if (!requireAuth()) return;
      const organizer = asText(event.address_name) || "Organisateur Paris";
      toggleFollowedOrganizer(organizer);
      follow.textContent = getFollowedOrganizers().includes(organizer)
        ? "Organisateur suivi"
        : "Suivre l’organisateur";
    });
  const reserve = app.querySelector("[data-reserve]");
  if (reserve instanceof HTMLButtonElement)
    reserve.addEventListener("click", () => {
      if (!requireAuth()) return;
      openPurchaseModal(event);
    });
}

function bindBackHome(): void {
  const back = app.querySelector("[data-go-home]");
  if (back instanceof HTMLButtonElement)
    back.addEventListener("click", () => navigate("/home"));
}

async function shareEvent(event: ParisEvent): Promise<void> {
  const title = asText(event.title) || "Événement OUTRS";
  const address = getEventAddress(event);
  const shareData: ShareData = {
    title,
    text: `${title} — ${address}`,
    url: window.location.href,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(
      `${title} — ${address} — ${window.location.href}`,
    );
  } catch {
    /* Copie indisponible */
  }
}

function openPurchaseModal(event: ParisEvent): void {
  const address = getEventAddress(event);
  const location = getEventLocation(event);
  const mapLinks = createMapLinks(location);
  showModal(
    Modal(
      "Réserver",
      `
    <label>Quantité<select id="ticket-quantity"><option value="1">1 billet</option><option value="2">2 billets</option><option value="3">3 billets</option><option value="4">4 billets</option></select></label>
    <label>Paiement<select id="ticket-payment"><option value="Apple Pay">Apple Pay</option><option value="Carte bancaire">Carte bancaire</option><option value="Gratuit">Gratuit</option></select></label>
    <button type="button" class="button button--primary" id="confirm-purchase">Confirmer et payer</button>
  `,
    ),
  );
  const confirm = document.querySelector("#confirm-purchase");
  if (confirm instanceof HTMLButtonElement)
    confirm.addEventListener("click", () => {
      const quantitySelect = document.querySelector("#ticket-quantity");
      const paymentSelect = document.querySelector("#ticket-payment");
      const quantity =
        quantitySelect instanceof HTMLSelectElement
          ? Number(quantitySelect.value)
          : 1;
      const payment =
        paymentSelect instanceof HTMLSelectElement
          ? paymentSelect.value
          : "Carte bancaire";
      const category = inferCategory(event);
      const ticket: Ticket = {
        id: `ticket-${Date.now()}`,
        eventId: asText(event.id),
        eventTitle: asText(event.title) || "Événement Paris",
        eventAddress: address,
        latitude: mapLinks.latitude ?? undefined,
        longitude: mapLinks.longitude ?? undefined,
        dateStart: event.date_start,
        quantity,
        payment,
        purchasedAt: new Date().toISOString(),
        category,
      };
      addTicket(ticket);
      addOut(category);
      const score = addScore(100);
      closeModal();
      showPurchaseConfirmation(ticket, score);
    });
}

function showPurchaseConfirmation(ticket: Ticket, score: number): void {
  showModal(
    Modal(
      "Billet ajouté !",
      `
    <p>Billet ajouté à votre billetterie ! Vous avez débloqué un nouvel Out (Sticker).</p>
    <p>Score actuel : ${score} points</p>
    ${ticket.eventAddress ? `<button type="button" class="address-link" id="maps-confirm"><span aria-hidden="true">⌖</span> ${escapeHtml(ticket.eventAddress)}</button>` : `<p>Adresse non communiquée</p>`}
    <button type="button" class="button button--primary" id="ticket-confirm">Voir mon billet</button>
  `,
    ),
  );
  const maps = document.querySelector("#maps-confirm");
  if (maps instanceof HTMLButtonElement)
    maps.addEventListener("click", () =>
      openMapSelector({
        addressName: ticket.eventAddress,
        latLon:
          ticket.latitude !== undefined && ticket.longitude !== undefined
            ? { lat: ticket.latitude, lon: ticket.longitude }
            : null,
      }),
    );
  const see = document.querySelector("#ticket-confirm");
  if (see instanceof HTMLButtonElement)
    see.addEventListener("click", () => {
      closeModal();
      navigate("/tickets");
    });
}

function renderTickets(
  initialTab: "Aujourd’hui" | "À venir" | "Archives" = "À venir",
): void {
  let tab = initialTab;
  const draw = (): void => {
    const tickets = getTickets();
    const now = new Date();
    const today = tickets.filter(
      (ticket) =>
        ticket.dateStart && isSameDay(new Date(ticket.dateStart), now),
    );
    const future = tickets.filter(
      (ticket) =>
        ticket.dateStart &&
        new Date(ticket.dateStart) > now &&
        !isSameDay(new Date(ticket.dateStart), now),
    );
    const archived = tickets.filter(
      (ticket) =>
        ticket.dateStart &&
        new Date(ticket.dateStart) < now &&
        !isSameDay(new Date(ticket.dateStart), now),
    );
    const shown =
      tab === "Aujourd’hui" ? today : tab === "À venir" ? future : archived;
    app.innerHTML = shell(
      `
      <header class="page-header"><p class="header__kicker">OUT75</p><h1>Mes billets</h1></header>
      <div class="subtabs">
        ${(["Aujourd’hui", "À venir", "Archives"] as const).map((item) => `<button type="button" class="pill${tab === item ? " is-active" : ""}" data-ticket-tab="${item}">${item}</button>`).join("")}
      </div>
      <div class="ticket-list">${shown.length > 0 ? shown.map(renderTicket).join("") : `<p class="status">Aucun billet dans cet onglet.</p>`}</div>
    `,
      "tickets",
    );
    bindBottomNav();
    app
      .querySelectorAll<HTMLButtonElement>("[data-ticket-tab]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          tab =
            button.dataset.ticketTab === "Aujourd’hui"
              ? "Aujourd’hui"
              : button.dataset.ticketTab === "Archives"
                ? "Archives"
                : "À venir";
          draw();
        });
      });
    app
      .querySelectorAll<HTMLButtonElement>("[data-ticket-maps]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const ticket = getTickets().find(
            (item) => item.id === button.dataset.ticketMaps,
          );
          if (!ticket) return;
          openMapSelector({
            addressName: ticket.eventAddress,
            latLon:
              ticket.latitude !== undefined && ticket.longitude !== undefined
                ? { lat: ticket.latitude, lon: ticket.longitude }
                : null,
          });
        });
      });
  };
  draw();
}

function renderTicket(ticket: Ticket): string {
  return `<article class="ticket-card">
    <div class="qr-code" aria-label="QR Code simulé">OUTRS<br>▦ ▦ ▦</div>
    <div>
      <h2>${escapeHtml(ticket.eventTitle)}</h2>
      <p>${escapeHtml(formatDate(ticket.dateStart))}</p>
      ${ticket.eventAddress ? `<button type="button" class="address-link" data-ticket-maps="${escapeHtml(ticket.id)}"><span aria-hidden="true">⌖</span> ${escapeHtml(ticket.eventAddress)}</button>` : `<p>Adresse non communiquée</p>`}
      <p>${ticket.quantity} billet(s) · ${escapeHtml(ticket.payment)}</p>
    </div>
  </article>`;
}

function getPostsWithMocks(): CommunityPost[] {
  const local = getPosts();
  return [...local, ...mockCommunityPosts];
}

function renderCommunity(): void {
  const posts = getPostsWithMocks();
  app.innerHTML = shell(
    `
    <header class="page-header"><p class="header__kicker">OUT75</p><h1>Outers</h1></header>
    <section class="lives" aria-label="Lives"><button type="button" class="live live--add" data-create-post>+</button>${["Phili", "Pigalle", "Bastille", "Canal", "Marais"].map((name) => `<button type="button" class="live" data-live="${escapeHtml(name)}"><span>●</span>${escapeHtml(name)}</button>`).join("")}</section>
    <div class="community-feed">${posts.map(renderCommunityPost).join("")}</div>
  `,
    "community",
  );
  bindBottomNav();
  const create = app.querySelector("[data-create-post]");
  if (create instanceof HTMLButtonElement)
    create.addEventListener("click", () => {
      if (!requireAuth()) return;
      openCreatePostModal();
    });
  app
    .querySelectorAll<HTMLButtonElement>("[data-post-open]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        navigate(`/share/${encodeURIComponent(button.dataset.postOpen ?? "")}`),
      );
    });
  app
    .querySelectorAll<HTMLButtonElement>("[data-post-like]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        if (!requireAuth()) return;
        togglePostLike(button.dataset.postLike ?? "");
        renderCommunity();
      });
    });
}

function renderCommunityPost(post: CommunityPost): string {
  return `<article class="post-card">
    ${post.challenge ? `<p class="post-card__challenge">Challenge organisateur : -15% si tu postes ta photo !</p>` : ""}
    <button type="button" class="post-card__header" data-post-open="${escapeHtml(post.id)}"><span class="avatar">${escapeHtml(post.avatar)}</span><strong>${escapeHtml(post.author)}</strong></button>
    ${post.image ? `<img class="post-card__image" src="${escapeHtml(post.image)}" alt="Photo publiée">` : `<div class="post-card__image post-card__image--empty">Photo OUT75</div>`}
    <p>${escapeHtml(post.text)}</p>
    <p><small>Événement lié : ${escapeHtml(post.eventTitle)}</small></p>
    <div class="post-card__actions"><button type="button" class="button button--small" data-post-like="${escapeHtml(post.id)}">${post.liked ? "♥" : "♡"} ${post.likes}</button><button type="button" class="button button--small" data-post-open="${escapeHtml(post.id)}">💬 ${post.comments.length}</button></div>
  </article>`;
}

function togglePostLike(postId: string): void {
  const local = getPosts();
  const localPost = local.find((post) => post.id === postId);
  if (localPost) {
    localPost.liked = !localPost.liked;
    localPost.likes += localPost.liked ? 1 : -1;
    setPosts(local);
    return;
  }
  // Les posts de démonstration ne sont pas persistés mais leur état reste lisible pendant la session.
  const mockPost = mockCommunityPosts.find((post) => post.id === postId);
  if (mockPost) {
    mockPost.liked = !mockPost.liked;
    mockPost.likes += mockPost.liked ? 1 : -1;
  }
}

function openCreatePostModal(): void {
  showModal(
    Modal(
      "Partager une sortie",
      `
    <label>Texte<textarea id="post-text" maxlength="280"></textarea></label>
    <label>Événement lié<input id="post-event" value="Sortie Paris"></label>
    <label>Image simulée<input id="post-image" type="file" accept="image/*"></label>
    <button type="button" class="button button--primary" id="publish-post">Publier</button>
  `,
    ),
  );
  const publish = document.querySelector("#publish-post");
  if (publish instanceof HTMLButtonElement)
    publish.addEventListener("click", () => {
      const textInput = document.querySelector("#post-text");
      const eventInput = document.querySelector("#post-event");
      const imageInput = document.querySelector("#post-image");
      const text =
        textInput instanceof HTMLTextAreaElement ? textInput.value.trim() : "";
      if (!text) return;
      const eventTitle =
        eventInput instanceof HTMLInputElement
          ? eventInput.value
          : "Sortie Paris";
      const finish = (image: string | null): void => {
        const user = getCurrentUser();
        const post: CommunityPost = {
          id: `post-${Date.now()}`,
          author: user?.name || "Utilisateur",
          avatar: (user?.name || "U").charAt(0).toUpperCase(),
          text,
          image,
          eventTitle,
          likes: 0,
          liked: false,
          comments: [],
          createdAt: new Date().toISOString(),
          challenge: true,
        };
        setPosts([post, ...getPosts()]);
        closeModal();
        renderCommunity();
      };
      if (
        imageInput instanceof HTMLInputElement &&
        imageInput.files &&
        imageInput.files[0]
      ) {
        const reader = new FileReader();
        reader.addEventListener("load", () =>
          finish(typeof reader.result === "string" ? reader.result : null),
        );
        reader.readAsDataURL(imageInput.files[0]);
      } else finish(null);
    });
}

function renderShare(postId: string): void {
  const post = getPostsWithMocks().find((item) => item.id === postId);
  if (!post) {
    navigate("/community");
    return;
  }
  app.innerHTML = shell(
    `
    <button type="button" class="button button--text" data-community-back>← Retour</button>
    <article class="share-post"><span class="avatar">${escapeHtml(post.avatar)}</span><strong>${escapeHtml(post.author)}</strong><p>${escapeHtml(post.text)}</p></article>
    <section class="comments"><h2>Partages / commentaires</h2>
      <div id="comment-list">${post.comments.map(renderComment).join("")}</div>
      <label>Votre commentaire<input id="comment-text" type="text" placeholder="Écrire une réponse"></label>
      <div class="gif-grid" id="gif-grid">${["Bravo 🎉", "Paris ❤️", "Sortie ✨", "Dance 🕺"].map((gif) => `<button type="button" class="pill" data-gif="${escapeHtml(gif)}">${escapeHtml(gif)}</button>`).join("")}</div>
      <button type="button" class="button button--primary" id="add-comment">Commenter</button>
    </section>
  `,
    "community",
  );
  const back = app.querySelector("[data-community-back]");
  if (back instanceof HTMLButtonElement)
    back.addEventListener("click", () => navigate("/community"));
  let selectedGif = "";
  app.querySelectorAll<HTMLButtonElement>("[data-gif]").forEach((button) =>
    button.addEventListener("click", () => {
      selectedGif = button.dataset.gif ?? "";
    }),
  );
  const add = app.querySelector("#add-comment");
  if (add instanceof HTMLButtonElement)
    add.addEventListener("click", () => {
      if (!requireAuth()) return;
      const input = app.querySelector("#comment-text");
      const text = input instanceof HTMLInputElement ? input.value.trim() : "";
      if (!text && !selectedGif) return;
      addComment(post.id, text, selectedGif);
      renderShare(post.id);
    });
}

function renderComment(comment: CommunityComment): string {
  return `<article class="comment"><strong>${escapeHtml(comment.author)}</strong>${comment.replyTo ? `<small>réponse à ${escapeHtml(comment.replyTo)}</small>` : ""}<p>${escapeHtml(comment.text)}${comment.gif ? ` ${escapeHtml(comment.gif)}` : ""}</p><button type="button" class="button button--text" data-reply="${escapeHtml(comment.author)}">Répondre</button></article>`;
}

function addComment(postId: string, text: string, gif: string): void {
  const local = getPosts();
  const localPost = local.find((post) => post.id === postId);
  const comment: CommunityComment = {
    id: `comment-${Date.now()}`,
    author: getCurrentUser()?.name || "Utilisateur",
    text,
    gif: gif || undefined,
    createdAt: new Date().toISOString(),
  };
  if (localPost) {
    localPost.comments.push(comment);
    setPosts(local);
  } else {
    const mockPost = mockCommunityPosts.find((post) => post.id === postId);
    if (mockPost) mockPost.comments.push(comment);
  }
}

function renderProfile(): void {
  const user = getCurrentUser();
  const tickets = getTickets();
  const favorites = getFavorites();
  const posts = getPosts();
  const score = getScore();
  const level = score >= 300 ? 3 : score >= 100 ? 2 : 1;
  const outs = getOuts();
  app.innerHTML = shell(
    `
    <header class="profile-header"><span class="profile-avatar">${escapeHtml((user?.name || "Invité").charAt(0).toUpperCase())}</span><h1>${escapeHtml(user?.name || "Profil invité")}</h1><p>${escapeHtml(user?.handle || "@invite")}</p><div class="profile-stats"><span><strong>${getFollowedOrganizers().length}</strong><small>Suivis</small></span><span><strong>0</strong><small>Abonnés</small></span><span><strong>${tickets.length}</strong><small>Events participés</small></span></div><button type="button" class="button" data-edit-profile>Modifier le profil</button></header>
    <section class="outs"><h2>Mes outs</h2><p><strong>${score} points</strong> · Niveau ${level}</p><p>${level >= 2 ? "Avantage : Réduction de -10% débloquée" : "Prochain avantage : Réduction de -10%"}</p><div class="outs-grid">${["Explorateur", "Concert", "Exposition", "Cinéma", "Théâtre", "Sport", "Soirée", "Gratuit"].map((out) => `<article class="out-card${outs.includes(out) ? " is-unlocked" : ""}"><span>${outs.includes(out) ? "OUT" : "🔒"}</span><strong>${escapeHtml(out)}</strong></article>`).join("")}</div></section>
    <section><h2>Mes posts</h2>${posts.length ? posts.map((post) => `<p>${escapeHtml(post.text)}</p>`).join("") : `<p class="status">Aucun post publié.</p>`}</section>
    <section><h2>Événements sauvegardés</h2>${favorites.length ? favorites.map((id) => `<p>${escapeHtml(id)}</p>`).join("") : `<p class="status">Aucun favori.</p>`}</section>
  `,
    "profile",
  );
  bindBottomNav();
  const edit = app.querySelector("[data-edit-profile]");
  if (edit instanceof HTMLButtonElement)
    edit.addEventListener("click", openProfileEditModal);
}

function openProfileEditModal(): void {
  const user = getCurrentUser();
  showModal(
    Modal(
      "Modifier le profil",
      `
    <label>Pseudo<input id="profile-name" value="${escapeHtml(user?.name || "")}"></label>
    <button type="button" class="button button--primary" id="save-profile">Enregistrer</button>
    <button type="button" class="button" id="logout-profile">Se déconnecter</button>
  `,
    ),
  );
  const save = document.querySelector("#save-profile");
  if (save instanceof HTMLButtonElement)
    save.addEventListener("click", () => {
      const input = document.querySelector("#profile-name");
      if (input instanceof HTMLInputElement && user) {
        registerUser(input.value.trim() || user.name, user.email);
      }
      closeModal();
      renderProfile();
    });
  const logout = document.querySelector("#logout-profile");
  if (logout instanceof HTMLButtonElement)
    logout.addEventListener("click", () => {
      logoutUser();
      closeModal();
      navigate("/welcome");
    });
}

function bindBottomNav(): void {
  app.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.nav ?? "home";
      navigate(`/${route}`);
    });
  });
}

function requireAuth(): boolean {
  if (isAuthenticated()) return true;
  showModal(QuickAuthModal());
  app
    .querySelectorAll<HTMLButtonElement>("[data-quick-auth]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const mode =
          button.dataset.quickAuth === "register" ? "register" : "login";
        closeModal();
        navigate(`/auth/${mode}`);
      });
    });
  return false;
}

function showModal(markup: string): void {
  closeModal();
  const host = document.createElement("div");
  host.id = "modal-root";
  host.innerHTML = markup;
  document.body.appendChild(host);
  app
    .querySelectorAll<HTMLButtonElement>("[data-close-modal]")
    .forEach((button) => button.addEventListener("click", closeModal));
  host
    .querySelectorAll<HTMLButtonElement>("[data-close-modal]")
    .forEach((button) => button.addEventListener("click", closeModal));

  document.addEventListener("keydown", handleModalEscape);

  host.addEventListener("click", (event: MouseEvent) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.classList.contains("modal-backdrop")
    ) {
      closeModal();
    }
  });
}

function closeModal(): void {
  document.removeEventListener("keydown", handleModalEscape);
  document.querySelector("#modal-root")?.remove();
}

function handleModalEscape(event: KeyboardEvent): void {
  if (event.key === "Escape") closeModal();
}

function getEventAddress(event: ParisEvent): string {
  return [
    asText(event.address_name),
    asText(event.address_street),
    asText(event.address_zipcode),
    asText(event.address_city),
  ]
    .filter((part) => part.length > 0)
    .join(" ");
}

function formatDate(value: string | null): string {
  if (!value) return "Date non précisée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non précisée";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(price: string | null): string {
  const value = asText(price);
  return value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "Tarif non précisé";
}

function stripHtml(value: string): string {
  const fragment = document.createElement("div");
  fragment.innerHTML = value;
  return fragment.textContent?.replace(/\s+/g, " ").trim() || "";
}

function inferCategory(event: ParisEvent): string {
  const text =
    `${asText(event.title)} ${asText(event.description)} ${asText(event.lead_text)} ${asText(event.price_type)}`.toLowerCase();
  if (text.includes("concert") || text.includes("musique")) return "Concert";
  if (
    text.includes("expo") ||
    text.includes("musée") ||
    text.includes("galerie")
  )
    return "Exposition";
  if (text.includes("ciné") || text.includes("film")) return "Cinéma";
  if (text.includes("théâtre") || text.includes("spectacle")) return "Théâtre";
  if (text.includes("sport") || text.includes("course") || text.includes("run"))
    return "Sport";
  if (text.includes("soir") || text.includes("club")) return "Soirée";
  return "Gratuit";
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function openMapSelector(location: MapLocationData): void {
  showModal(MapSelectorModal(location));
  const modal = document.querySelector("#modal-root");
  if (modal) bindMapSelectorCopy(modal);
}

function getEventLocation(event: ParisEvent): MapLocationData {
  return {
    latLon: event.lat_lon,
    addressName: event.address_name,
    addressStreet: event.address_street,
    addressZipcode: event.address_zipcode,
    addressCity: event.address_city,
  };
}
