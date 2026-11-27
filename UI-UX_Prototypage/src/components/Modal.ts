import { escapeHtml } from "../utils/html.ts";

/** Rendu générique accessible d’une modale locale. */
export function Modal(
  title: string,
  body: string,
  id = "modal-dialog",
): string {
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" id="${escapeHtml(id)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal__header">
          <h2>${escapeHtml(title)}</h2>
          <button type="button" class="modal__close" data-close-modal aria-label="Fermer">×</button>
        </div>
        <div class="modal__body">${body}</div>
      </section>
    </div>
  `;
}
