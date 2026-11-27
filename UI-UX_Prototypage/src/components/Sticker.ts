import { openOverlay } from "../app.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";

/** Catalogue des Outs : un seul visuel de sticker, décliné par catégorie. */
export const OUTS_CATALOG = [
  "Explorateur",
  "Concert",
  "Exposition",
  "Cinéma",
  "Théâtre",
  "Sport",
  "Soirée",
  "Gratuit",
] as const;

/** Sticker débloqué (visuel unique) ou verrouillé (boilerplate gris). */
export function Sticker(label: string, unlocked: boolean, size: "square" | "wide" = "square"): string {
  return `<figure class="sticker${size === "wide" ? " sticker--wide" : ""}${unlocked ? "" : " is-locked"}">
    <span class="sticker__art">${icon(unlocked ? "sticker" : "sticker-boilerplate")}</span>
    ${unlocked ? "" : `<span class="sticker__lock">${icon("lock")}</span>`}
    <figcaption class="sticker__label">${escapeHtml(label)}</figcaption>
  </figure>`;
}

/** Pop-up « TITRE STICKER » affichée après une réservation. */
export function openStickerPopup(category: string, onDone: () => void): void {
  const popup = openOverlay(
    `<div class="sticker-popup">
      <h2 class="display">Out ${escapeHtml(category)}</h2>
      <span class="sticker-popup__art" role="img" aria-label="Sticker ${escapeHtml(category)}">${icon("sticker")}</span>
      <button type="button" class="button button--primary button--block button--badge" data-action="collect">Ajouter à la collection</button>
    </div>`,
    {
      variant: "center",
      label: `Nouveau sticker ${category}`,
      dismissible: false,
      actions: {
        collect: () => {
          popup.close();
          onDone();
        },
      },
    },
  );
}
