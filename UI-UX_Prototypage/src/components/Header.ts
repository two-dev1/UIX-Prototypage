import { escapeHtml } from "../utils/html.ts";

/** Rend le bloc d’en-tête principal de l’application. */
export function Header(title: string, introduction: string): string {
  return `
    <header class="header">
      <p class="header__kicker">Ville de Paris</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="header__intro">${escapeHtml(introduction)}</p>
    </header>
  `;
}
