import { Modal } from "./Modal.ts";
import { createMapLinks, type MapLocationData } from "../utils/maps.ts";
import { escapeHtml } from "../utils/html.ts";

/** Action sheet permettant de choisir une application GPS ou de copier l’adresse. */
export function MapSelectorModal(location: MapLocationData): string {
  const links = createMapLinks(location);

  if (!links.address && links.google === null) {
    return Modal(
      "Adresse indisponible",
      `
      <p>Aucune donnée de localisation exploitable n’est disponible pour cet événement.</p>
      <button type="button" class="button" data-close-modal>Fermer</button>
    `,
      "map-selector-modal",
    );
  }

  return Modal(
    "S’y rendre",
    `
    <p class="map-selector__address"><strong>Adresse</strong><br>${escapeHtml(links.address)}</p>
    ${links.google ? `<a class="button map-selector__link" href="${escapeHtml(links.google)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps</a>` : ""}
    ${links.waze ? `<a class="button map-selector__link" href="${escapeHtml(links.waze)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Waze</a>` : ""}
    ${links.apple ? `<a class="button map-selector__link" href="${escapeHtml(links.apple)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Apple Plans</a>` : ""}
    <button type="button" class="button" data-copy-address="${escapeHtml(links.address)}">Copier l’adresse</button>
    <button type="button" class="button button--text" data-close-modal>Fermer / Annuler</button>
  `,
    "map-selector-modal",
  );
}

/** Raccorde l’action de copie et son retour visuel. */
export function bindMapSelectorCopy(root: ParentNode): void {
  root
    .querySelectorAll<HTMLButtonElement>("[data-copy-address]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const address = button.dataset.copyAddress ?? "";
        try {
          await navigator.clipboard.writeText(address);
        } catch {
          // Retourne un état compatible même si l’API presse-papier est bloquée.
          button.textContent = "Copie non disponible";
          return;
        }
        button.textContent = "Adresse copiée !";
      });
    });
}
