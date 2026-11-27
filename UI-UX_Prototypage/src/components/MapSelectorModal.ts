import { createMapLinks, type MapLocationData } from "../utils/maps.ts";
import { escapeHtml } from "../utils/html.ts";
import { openSheet } from "./Sheet.ts";

/** Action sheet : choisir une application GPS ou copier l’adresse. */
export function openMapSelector(location: MapLocationData): void {
  const links = createMapLinks(location);
  if (!links.address && links.google === null) {
    openSheet(
      "Adresse indisponible",
      `<p class="body">Aucune donnée de localisation exploitable n’est disponible pour cet événement.</p>`,
      { footer: `<button type="button" class="button button--primary button--block" data-action="close">Fermer</button>` },
    );
    return;
  }

  const link = (href: string | null, label: string): string =>
    href
      ? `<a class="button button--dark button--block button--label" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : "";

  openSheet(
    "S’y rendre",
    `${links.address ? `<p class="body">${escapeHtml(links.address)}</p>` : ""}
     <div class="stack stack--12">
       ${link(links.google, "Ouvrir dans Google Maps")}
       ${link(links.waze, "Ouvrir dans Waze")}
       ${link(links.apple, "Ouvrir dans Apple Plans")}
     </div>`,
    {
      footer: `<button type="button" class="button button--primary button--block button--label" data-action="copy-address">Copier l’adresse</button>`,
      actions: {
        "copy-address": async (button) => {
          try {
            await navigator.clipboard.writeText(links.address);
            button.textContent = "Adresse copiée !";
          } catch {
            button.textContent = "Copie non disponible";
          }
        },
      },
    },
  );
}
