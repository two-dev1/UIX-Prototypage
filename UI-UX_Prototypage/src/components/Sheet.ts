import { openOverlay, type ActionMap, type OverlayHandle } from "../app.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";

/** Feuille du bas générique (style « QFAP/Commentaires »). */
export function openSheet(
  title: string,
  body: string,
  options: { footer?: string; actions?: ActionMap; className?: string; onClose?: () => void } = {},
): OverlayHandle {
  return openOverlay(
    `<section class="sheet${options.className ? ` ${options.className}` : ""}">
      <div class="sheet__body">
        <div class="sheet__head">
          <h2 class="h2">${escapeHtml(title)}</h2>
          <button type="button" class="icon-button icon-button--sm sheet__close" data-action="close" aria-label="Fermer">${icon("cross")}</button>
        </div>
        ${body}
      </div>
      ${options.footer ? `<div class="sheet__footer">${options.footer}</div>` : ""}
    </section>`,
    { label: title, actions: options.actions, onClose: options.onClose },
  );
}
