/**
 * Accueil : flux d'événements OpenData Paris.
 * Logique conservée : pagination de 20 bornée par `total_count` (et 200 max),
 * recherche en direct par mot-clé, annulation des requêtes obsolètes.
 * Optimisations : ajout incrémental des cartes, cache et position de défilement conservés.
 */
import { getEventsPage } from "../api.ts";
import { mountScreen, root } from "../app.ts";
import { AppScreen, TopBar, chromeActions } from "../components/chrome.ts";
import { EventCard, EventCardSkeleton } from "../components/EventCard.ts";
import { cacheEvents, eventCardActions } from "../components/eventActions.ts";
import { openSheet } from "../components/Sheet.ts";
import { InstallBanner } from "../install.ts";
import { navigate } from "../router.ts";
import { getFavorites, getLikedEvents } from "../store.ts";
import type { ParisEvent } from "../types.ts";
import { getEventSlot } from "../utils/events.ts";
import { asText, escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";

const PAGE_SIZE = 20;
const MAX_RESULTS = 200;
const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, index) => `750${String(index + 1).padStart(2, "0")}`);
const QUICK_CATEGORIES = ["Concert", "Expo", "Théâtre", "Cinéma", "Sport"] as const;

interface HomeState {
  events: ParisEvent[];
  totalCount: number;
  offset: number;
  isLoading: boolean;
  error: string;
  searchValue: string;
  freeOnly: boolean;
  slotFilter: "" | "Matin/Journée" | "Soir";
  arrondissement: string;
  category: string;
  requestVersion: number;
  scrollY: number;
  loadedKey: string;
}

const state: HomeState = {
  events: [],
  totalCount: 0,
  offset: 0,
  isLoading: false,
  error: "",
  searchValue: "",
  freeOnly: false,
  slotFilter: "",
  arrondissement: "",
  category: "",
  requestVersion: 0,
  scrollY: 0,
  loadedKey: "",
};

let activeRequest: AbortController | undefined;
let observer: IntersectionObserver | undefined;

const filtersKey = (): string =>
  JSON.stringify([state.searchValue, state.freeOnly, state.slotFilter, state.arrondissement, state.category]);

function pills(): string {
  const chip = (label: string, action: string, active: boolean, data = ""): string =>
    `<button type="button" class="chip${active ? " is-active" : ""}" data-action="${action}"${data} aria-pressed="${active}">${escapeHtml(label)}</button>`;
  const noFilter = !state.freeOnly && !state.slotFilter && !state.category && !state.arrondissement && !state.searchValue;
  return `
    <button type="button" class="chip chip--icon${noFilter ? " is-active" : ""}" data-action="reset-filters" aria-label="Tendances : tous les événements" aria-pressed="${noFilter}">${icon("fire")}</button>
    ${chip("Gratuit", "toggle-free", state.freeOnly)}
    ${chip("Ce soir", "toggle-slot", state.slotFilter === "Soir", ' data-slot="Soir"')}
    ${chip("En journée", "toggle-slot", state.slotFilter === "Matin/Journée", ' data-slot="Matin/Journée"')}
    ${QUICK_CATEGORIES.map((category) => chip(category, "toggle-category", state.category === category, ` data-category="${escapeHtml(category)}"`)).join("")}
    ${chip("Catégories", "open-categories", false)}
    ${chip(state.arrondissement ? `Paris ${state.arrondissement.slice(3)}e` : "Arrondissement", "open-filters", Boolean(state.arrondissement))}`;
}

export function renderHome(): void {
  // Requêtes venant d'autres écrans (recherche globale, catégorie choisie).
  const pendingSearch = sessionStorage.getItem("outrs-search");
  const pendingCategory = sessionStorage.getItem("outrs-category");
  sessionStorage.removeItem("outrs-search");
  sessionStorage.removeItem("outrs-category");
  if (pendingSearch !== null) state.searchValue = pendingSearch;
  if (pendingCategory !== null) state.category = pendingCategory;

  const signal = mountScreen(
    AppScreen(
      `${TopBar("Accueil")}
      <section class="stack stack--20">
        <h2 class="display">${state.searchValue ? `« ${escapeHtml(state.searchValue)} »` : "On sort sur Paris?"}</h2>
        <div class="h-scroll" data-pills role="toolbar" aria-label="Filtres">${pills()}</div>
      </section>
      ${InstallBanner()}
      <section class="feed" aria-labelledby="feed-title">
        <h2 id="feed-title" class="visually-hidden">Événements</h2>
        <ul class="feed" id="event-grid"></ul>
        <div class="status" id="event-status" aria-live="polite"></div>
        <span id="event-sentinel" aria-hidden="true"></span>
      </section>`,
      "home",
    ),
    {
      ...chromeActions({
        onSearch: (query, { live }) => {
          if (live && query.length > 0 && query.length < 2) return;
          if (query === state.searchValue) return;
          state.searchValue = query;
          const title = root.querySelector(".display");
          if (title) title.textContent = query ? `« ${query} »` : "On sort sur Paris?";
          refreshPills();
          void resetAndLoadEvents();
        },
      }),
      ...eventCardActions(),
      "open-event": (target) => {
        state.scrollY = window.scrollY;
        navigate(`/event/${encodeURIComponent(target.dataset.id ?? "")}`);
      },
      "reset-filters": () => {
        Object.assign(state, { freeOnly: false, slotFilter: "", category: "", arrondissement: "", searchValue: "" });
        const title = root.querySelector(".display");
        if (title) title.textContent = "On sort sur Paris?";
        applyFilters();
      },
      "clear-search": () => {
        state.searchValue = "";
        const title = root.querySelector(".display");
        if (title) title.textContent = "On sort sur Paris?";
        applyFilters();
      },
      "toggle-free": () => {
        state.freeOnly = !state.freeOnly;
        applyFilters();
      },
      "toggle-slot": (target) => {
        const slot = (target.dataset.slot ?? "") as HomeState["slotFilter"];
        state.slotFilter = state.slotFilter === slot ? "" : slot;
        applyFilters();
      },
      "toggle-category": (target) => {
        const category = target.dataset.category ?? "";
        state.category = state.category === category ? "" : category;
        applyFilters();
      },
      "open-categories": () => navigate("/categories"),
      "open-filters": openArrondissementSheet,
    },
  );

  signal.addEventListener("abort", () => {
    state.scrollY = window.scrollY;
    observer?.disconnect();
  });

  if (state.events.length > 0 && state.loadedKey === filtersKey()) {
    renderEventGrid(state.events, true);
    updateEventStatus();
    requestAnimationFrame(() => window.scrollTo({ top: state.scrollY, behavior: "instant" }));
    setupSentinel();
    return;
  }
  void resetAndLoadEvents();
}

function refreshPills(): void {
  const host = root.querySelector("[data-pills]");
  if (host) host.innerHTML = pills();
}

/** Catégorie courante, lue par l'écran Catégories pour surligner la bonne carte. */
export function activeCategory(): string {
  return state.category;
}

function applyFilters(): void {
  refreshPills();
  void resetAndLoadEvents();
}

function openArrondissementSheet(): void {
  const sheet = openSheet(
    "Arrondissement",
    `<div class="option-list">
      <button type="button" class="chip${state.arrondissement ? "" : " is-active"}" data-action="pick" data-value="">Tout Paris</button>
      ${ARRONDISSEMENTS.map(
        (value) =>
          `<button type="button" class="chip${state.arrondissement === value ? " is-active" : ""}" data-action="pick" data-value="${value}">${Number(value.slice(3))}e</button>`,
      ).join("")}
    </div>`,
    {
      actions: {
        pick: (target) => {
          state.arrondissement = target.dataset.value ?? "";
          sheet.close();
          applyFilters();
        },
      },
    },
  );
}

async function resetAndLoadEvents(): Promise<void> {
  state.requestVersion++;
  activeRequest?.abort();
  activeRequest = undefined;
  observer?.disconnect();
  state.events = [];
  state.offset = 0;
  state.totalCount = 0;
  state.isLoading = false;
  state.error = "";
  state.loadedKey = filtersKey();

  const grid = root.querySelector("#event-grid");
  if (grid) grid.innerHTML = `<li>${EventCardSkeleton()}</li><li>${EventCardSkeleton()}</li>`;
  updateEventStatus();
  await loadEventPage();
}

async function loadEventPage(): Promise<void> {
  if (state.isLoading || (state.totalCount > 0 && state.offset >= state.totalCount) || state.offset >= MAX_RESULTS) {
    updateEventStatus();
    return;
  }

  state.isLoading = true;
  state.error = "";
  const version = state.requestVersion;
  const controller = new AbortController();
  activeRequest?.abort();
  activeRequest = controller;
  updateEventStatus();

  try {
    const page = await getEventsPage({
      limit: PAGE_SIZE,
      offset: state.offset,
      search: state.searchValue,
      freeOnly: state.freeOnly,
      arrondissement: state.arrondissement,
      category: state.category,
      signal: controller.signal,
    });
    if (version !== state.requestVersion || controller.signal.aborted) return;

    state.totalCount = page.totalCount;
    let next = page.results;
    if (state.slotFilter === "Matin/Journée")
      next = next.filter((event) => ["Matin", "Journée"].includes(getEventSlot(event.date_start)));
    if (state.slotFilter === "Soir") next = next.filter((event) => getEventSlot(event.date_start) === "Soir");

    const isFirstPage = state.offset === 0;
    state.events = [...state.events, ...next];
    cacheEvents(page.results);
    if (page.results.length === 0) state.totalCount = state.offset;
    state.offset += page.results.length;
    renderEventGrid(next, isFirstPage);
  } catch (error: unknown) {
    if (version !== state.requestVersion || controller.signal.aborted) return;
    state.error = error instanceof Error ? error.message : "Erreur de chargement.";
    if (state.events.length === 0) {
      const grid = root.querySelector("#event-grid");
      if (grid) grid.innerHTML = "";
    }
  } finally {
    if (version === state.requestVersion) {
      state.isLoading = false;
      activeRequest = undefined;
      updateEventStatus();
      setupSentinel();
    }
  }
}

/** Ajout incrémental : seules les nouvelles cartes sont insérées dans le DOM. */
function renderEventGrid(events: ParisEvent[], replace: boolean): void {
  const grid = root.querySelector("#event-grid");
  if (!grid) return;
  const favorites = new Set(getFavorites());
  const liked = new Set(getLikedEvents());
  const html = events
    .map((event, index) => {
      const id = asText(event.id);
      return `<li>${EventCard(event, { saved: favorites.has(id), liked: liked.has(id), eager: replace && index === 0 })}</li>`;
    })
    .join("");
  if (replace) grid.innerHTML = html;
  else grid.insertAdjacentHTML("beforeend", html);
}

/** État vide : message + filtres existants pour relancer la recherche. */
function noResults(): string {
  const hasSearch = Boolean(state.searchValue);
  return `<div class="empty">
    <p class="h1">Aucun résultat</p>
    <p class="body">${
      hasSearch
        ? `Rien pour « ${escapeHtml(state.searchValue)} ». Affinez votre recherche ou essayez un filtre.`
        : "Aucun événement avec ces filtres. Affinez votre recherche."
    }</p>
    <div class="option-list option-list--center">
      ${hasSearch ? `<button type="button" class="chip" data-action="clear-search">Effacer la recherche</button>` : ""}
      <button type="button" class="chip" data-action="reset-filters">Tout voir</button>
      <button type="button" class="chip" data-action="toggle-free">Gratuit</button>
      <button type="button" class="chip" data-action="toggle-slot" data-slot="Soir">Ce soir</button>
      ${QUICK_CATEGORIES.map((category) => `<button type="button" class="chip" data-action="toggle-category" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}
      <button type="button" class="chip" data-action="open-categories">Catégories</button>
      <button type="button" class="chip" data-action="open-filters">Arrondissement</button>
      <button type="button" class="chip" data-action="search">Nouvelle recherche</button>
    </div>
  </div>`;
}

function updateEventStatus(): void {
  const status = root.querySelector<HTMLElement>("#event-status");
  if (!status) return;
  status.className = "status";
  if (state.error) {
    status.className = "status status--error";
    status.innerHTML = `<span>${escapeHtml(state.error)}</span><button type="button" class="button button--primary button--label" id="retry">Réessayer</button>`;
    status.querySelector("#retry")?.addEventListener("click", () => void loadEventPage(), { once: true });
    return;
  }
  if (state.isLoading) status.textContent = state.events.length > 0 ? "Chargement…" : "";
  else if (state.events.length === 0) {
    status.className = "stack";
    status.innerHTML = noResults();
  }
  else if ((state.totalCount > 0 && state.offset >= state.totalCount) || state.offset >= MAX_RESULTS)
    status.textContent = "Tu as tout vu !";
  else status.textContent = "";
}

function setupSentinel(): void {
  const sentinel = root.querySelector("#event-sentinel");
  if (!sentinel || typeof IntersectionObserver === "undefined") return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadEventPage();
    },
    { rootMargin: "600px" },
  );
  observer.observe(sentinel);
}
