import { escapeHtml } from "../utils/html.ts";

export type BottomTab = "home" | "tickets" | "community" | "profile";

/** Barre de navigation fixe commune à toutes les vues principales. */
export function BottomNav(active: BottomTab): string {
  const tabs: Array<{ id: BottomTab; label: string; icon: string }> = [
    { id: "home", label: "Accueil", icon: "⌂" },
    { id: "tickets", label: "Billets", icon: "◫" },
    { id: "community", label: "Outers", icon: "◎" },
    { id: "profile", label: "Mon espace", icon: "●" },
  ];
  return `<nav class="bottom-nav" aria-label="Navigation principale">${tabs
    .map(
      (tab) => `
    <button type="button" class="bottom-nav__tab${tab.id === active ? " is-active" : ""}" data-nav="${escapeHtml(tab.id)}">
      <span aria-hidden="true">${escapeHtml(tab.icon)}</span>
      <span>${escapeHtml(tab.label)}</span>
    </button>
  `,
    )
    .join("")}</nav>`;
}
