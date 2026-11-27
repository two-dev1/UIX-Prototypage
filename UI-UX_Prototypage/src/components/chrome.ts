/**
 * Habillage commun des écrans applicatifs.
 * - Mobile (< 768 px) : barre du haut (+ / titre / recherche) et navigation basse.
 * - Tablette (768–1279 px) : navigation gauche en icônes, fil central.
 * - Desktop (≥ 1280 px) : navigation gauche complète, fil central, panneau de droite
 *   (recherche permanente, lives, catégories, prochains billets) — façon X.
 * Un seul balisage : la mise en page change uniquement en CSS.
 */
import { openAuthGate, requireAuth, type ActionMap } from "../app.ts";
import { isAuthenticated } from "../auth.ts";
import { mockLives } from "../data/mockCommunity.ts";
import { goBack, navigate } from "../router.ts";
import { getCurrentUser, getTickets } from "../store.ts";
import { CATEGORIES, parseDate } from "../utils/events.ts";
import { escapeHtml } from "../utils/html.ts";
import { avatarImg, icon, type IconName } from "../utils/icons.ts";
import { openLive } from "./LiveModal.ts";
import { openSearch, type SearchHandler } from "./SearchOverlay.ts";

export type BottomTab = "home" | "tickets" | "community" | "profile";

const TABS: Array<{ id: BottomTab; label: string; icon: IconName }> = [
  { id: "home", label: "Accueil", icon: "home" },
  { id: "tickets", label: "Réservations", icon: "ticket" },
  { id: "community", label: "Outers", icon: "community" },
  { id: "profile", label: "Profil", icon: "profile" },
];

const shortDate = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

interface TopBarOptions {
  /** `plus` (créer un post / une story) par défaut, `back` pour un retour. */
  left?: "plus" | "back";
  search?: boolean;
}

export function TopBar(title: string, options: TopBarOptions = {}): string {
  const { left = "plus", search = true } = options;
  const leftButton =
    left === "back"
      ? `<button type="button" class="icon-button icon-button--edge" data-action="back" aria-label="Retour">${icon("back")}</button>`
      : `<button type="button" class="icon-button icon-button--edge topbar__create" data-action="create" aria-label="Créer un post ou une story">${icon("plus")}</button>`;
  const rightButton = search
    ? `<button type="button" class="icon-button icon-button--edge topbar__search" data-action="search" aria-label="Rechercher">${icon("search-white")}</button>`
    : `<span class="icon-button icon-button--edge topbar__spacer" aria-hidden="true"></span>`;
  return `<header class="topbar">${leftButton}<h1 class="topbar__title"><span>${escapeHtml(title)}</span></h1>${rightButton}</header>`;
}

/** Navigation pill mobile : 4 destinations, icônes seules, libellés accessibles. */
function BottomNav(active: BottomTab | null): string {
  return `<nav class="bottom-nav" aria-label="Navigation principale">${TABS.map(
    (tab) => `<button type="button" class="bottom-nav__tab${tab.id === active ? " is-active" : ""}" data-action="nav" data-to="${tab.id}" aria-label="${escapeHtml(tab.label)}"${tab.id === active ? ' aria-current="page"' : ""}>
      <span class="bottom-nav__pill">${icon(tab.icon)}</span>
    </button>`,
  ).join("")}</nav>`;
}

/** Navigation latérale (tablette / desktop) : logo, liens, « Publier », compte. */
function SideNav(active: BottomTab | null): string {
  const user = getCurrentUser();
  return `<aside class="side-nav" aria-label="Navigation principale">
    <button type="button" class="side-nav__logo" data-action="nav" data-to="home" aria-label="OUT75 — Accueil">${icon("logo-text")}</button>
    <nav class="side-nav__links">
      ${TABS.map(
        (tab) => `<button type="button" class="side-nav__link${tab.id === active ? " is-active" : ""}" data-action="nav" data-to="${tab.id}"${tab.id === active ? ' aria-current="page"' : ""}>
          <span class="side-nav__icon">${icon(tab.icon)}</span><span class="side-nav__label">${escapeHtml(tab.label)}</span>
        </button>`,
      ).join("")}
    </nav>
    <button type="button" class="button button--primary side-nav__publish" data-action="create" aria-label="Publier un post ou une story">
      <span class="side-nav__publish-icon" aria-hidden="true">+</span><span class="side-nav__label">Publier</span>
    </button>
    ${
      user
        ? `<button type="button" class="side-nav__account" data-action="nav" data-to="profile">
            <span class="avatar">${user.avatar ? avatarImg(user.avatar, 40) : escapeHtml(user.name.charAt(0))}</span>
            <span class="side-nav__label side-nav__who"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.handle)}</span></span>
          </button>`
        : `<button type="button" class="side-nav__account" data-action="gate">
            <span class="avatar" aria-hidden="true">?</span>
            <span class="side-nav__label side-nav__who"><strong>Invité</strong><span>Se connecter</span></span>
          </button>`
    }
  </aside>`;
}

/** Panneau de droite (desktop) : recherche permanente, lives, catégories, prochains billets. */
function SidePanel(): string {
  const now = Date.now() - 86_400_000;
  const upcoming = getTickets()
    .filter((ticket) => (parseDate(ticket.dateStart)?.getTime() ?? Number.MAX_SAFE_INTEGER) >= now)
    .sort(
      (a, b) =>
        (parseDate(a.dateStart)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (parseDate(b.dateStart)?.getTime() ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 3);
  const tickets = !isAuthenticated()
    ? `<p class="caption muted">Connecte-toi pour réserver et retrouver tes QR codes.</p>
       <button type="button" class="button button--primary button--label button--block" data-action="gate">Se connecter</button>`
    : upcoming.length > 0
      ? `<ul class="side-panel__list">${upcoming
          .map((ticket) => {
            const date = parseDate(ticket.dateStart);
            return `<li><button type="button" class="side-panel__ticket" data-action="nav" data-to="tickets">
              <span class="h2 side-panel__ellipsis">${escapeHtml(ticket.eventTitle)}</span>
              <span class="caption lime">${date ? escapeHtml(shortDate.format(date)) : "Date à venir"} · x${ticket.quantity}</span>
            </button></li>`;
          })
          .join("")}</ul>`
      : `<p class="caption muted">Aucune réservation à venir.</p>`;

  return `<aside class="side-panel" aria-label="Raccourcis">
    <form class="side-search" role="search" data-side-search>
      <label class="visually-hidden" for="side-search-input">Rechercher un événement</label>
      <span class="side-search__icon" aria-hidden="true">${icon("search-green")}</span>
      <input id="side-search-input" class="side-search__input" type="search" placeholder="Recherchez ce que vous voulez" autocomplete="off" enterkeyhint="search">
    </form>
    <section class="side-card" aria-labelledby="panel-lives">
      <h2 id="panel-lives" class="h2">Lives des Outers</h2>
      <div class="side-panel__lives">${mockLives
        .map(
          (live) => `<button type="button" class="story story--live story--sm" data-action="open-live" data-id="${live.id}" aria-label="Live de ${escapeHtml(live.host)} à ${escapeHtml(live.place)}">
            <img src="${escapeHtml(live.image.replace("w=720", "w=120"))}" alt="" width="48" height="48" loading="lazy" decoding="async"><span class="story__badge">LIVE</span>
          </button>`,
        )
        .join("")}</div>
    </section>
    <section class="side-card" aria-labelledby="panel-categories">
      <div class="section-head"><h2 id="panel-categories" class="h2">Catégories</h2><button type="button" class="link link--underline" data-action="nav" data-to="categories">Voir tout</button></div>
      <div class="option-list">${CATEGORIES.slice(0, 6)
        .map((category) => `<button type="button" class="chip chip--sm" data-action="pick-category" data-id="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>`)
        .join("")}</div>
    </section>
    <section class="side-card" aria-labelledby="panel-tickets">
      <div class="section-head"><h2 id="panel-tickets" class="h2">Mes prochains billets</h2>${
        isAuthenticated() ? `<button type="button" class="link link--underline" data-action="nav" data-to="tickets">Voir tout</button>` : ""
      }</div>
      ${tickets}
    </section>
  </aside>`;
}

/** Écran applicatif complet, responsive : nav gauche + contenu + panneau droit + nav basse mobile. */
export function AppScreen(content: string, active: BottomTab | null, className = ""): string {
  return `<div class="app-layout">
    ${SideNav(active)}
    <main class="screen${className ? ` ${className}` : ""}">${content}</main>
    ${SidePanel()}
  </div>${BottomNav(active)}`;
}

/* ---------- Recherche permanente du panneau droit ---------- */

const defaultSearch: SearchHandler = (query) => {
  sessionStorage.setItem("outrs-search", query);
  navigate("/home");
};
let activeSearch: SearchHandler = defaultSearch;
let sideSearchTimer: number | undefined;

document.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.closest("[data-side-search]")) return;
  // Recherche en direct uniquement sur les écrans qui la gèrent (accueil, Outers).
  if (activeSearch === defaultSearch) return;
  window.clearTimeout(sideSearchTimer);
  sideSearchTimer = window.setTimeout(() => activeSearch(input.value.trim(), { live: true }), 300);
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches("[data-side-search]")) return;
  event.preventDefault();
  window.clearTimeout(sideSearchTimer);
  const input = form.querySelector<HTMLInputElement>("input");
  activeSearch(input?.value.trim() ?? "", { live: false });
});

/** Actions partagées par tous les écrans applicatifs (mobile et desktop). */
export function chromeActions(options: { onSearch?: SearchHandler; backFallback?: string } = {}): ActionMap {
  activeSearch = options.onSearch ?? defaultSearch;
  return {
    nav: (target) => navigate(`/${target.dataset.to ?? "home"}`),
    back: () => goBack(options.backFallback ?? "/home"),
    create: () => {
      if (requireAuth("/camera")) navigate("/camera");
    },
    search: () => openSearch(activeSearch),
    gate: () => openAuthGate(),
    "open-live": (target) => openLive(target.dataset.id ?? ""),
    "pick-category": (target) => {
      sessionStorage.setItem("outrs-category", target.dataset.id ?? "");
      navigate("/home");
    },
  };
}
