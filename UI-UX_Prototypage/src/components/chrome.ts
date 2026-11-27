/**
 * Habillage commun des écrans applicatifs : barre du haut (+ / titre / recherche)
 * et navigation basse OUTRS, avec leurs actions partagées.
 */
import { requireAuth, type ActionMap } from "../app.ts";
import { goBack, navigate } from "../router.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon, type IconName } from "../utils/icons.ts";
import { openSearch, type SearchHandler } from "./SearchOverlay.ts";

export type BottomTab = "home" | "tickets" | "community" | "profile";

const TABS: Array<{ id: BottomTab; label: string; icon: IconName }> = [
  { id: "home", label: "Accueil", icon: "home" },
  { id: "tickets", label: "Réservations", icon: "ticket" },
  { id: "community", label: "Outers", icon: "community" },
  { id: "profile", label: "Profil", icon: "profile" },
];

export interface TopBarOptions {
  /** `plus` (créer un post / une story) par défaut, `back` pour un retour. */
  left?: "plus" | "back";
  search?: boolean;
}

export function TopBar(title: string, options: TopBarOptions = {}): string {
  const { left = "plus", search = true } = options;
  const leftButton =
    left === "back"
      ? `<button type="button" class="icon-button icon-button--edge" data-action="back" aria-label="Retour">${icon("back")}</button>`
      : `<button type="button" class="icon-button icon-button--edge" data-action="create" aria-label="Créer un post ou une story">${icon("plus")}</button>`;
  const rightButton = search
    ? `<button type="button" class="icon-button icon-button--edge" data-action="search" aria-label="Rechercher">${icon("search-white")}</button>`
    : `<span class="icon-button icon-button--edge" aria-hidden="true"></span>`;
  return `<header class="topbar">${leftButton}<h1 class="topbar__title"><span>${escapeHtml(title)}</span></h1>${rightButton}</header>`;
}

/** Navigation pill 4 destinations : icônes seules, libellés accessibles. */
export function BottomNav(active: BottomTab | null): string {
  return `<nav class="bottom-nav" aria-label="Navigation principale">${TABS.map(
    (tab) => `<button type="button" class="bottom-nav__tab${tab.id === active ? " is-active" : ""}" data-action="nav" data-to="${tab.id}" aria-label="${escapeHtml(tab.label)}"${tab.id === active ? ' aria-current="page"' : ""}>
      <span class="bottom-nav__pill">${icon(tab.icon)}</span>
    </button>`,
  ).join("")}</nav>`;
}

/** Écran applicatif complet : barre du haut + contenu + navigation basse. */
export function AppScreen(content: string, active: BottomTab | null, className = ""): string {
  return `<main class="screen${className ? ` ${className}` : ""}">${content}</main>${BottomNav(active)}`;
}

/** Actions partagées par tous les écrans applicatifs. */
export function chromeActions(options: { onSearch?: SearchHandler; backFallback?: string } = {}): ActionMap {
  return {
    nav: (target) => navigate(`/${target.dataset.to ?? "home"}`),
    back: () => goBack(options.backFallback ?? "/home"),
    create: () => {
      if (requireAuth("/camera")) navigate("/camera");
    },
    search: () =>
      openSearch(
        options.onSearch ??
          ((query) => {
            sessionStorage.setItem("outrs-search", query);
            navigate("/home");
          }),
      ),
  };
}
