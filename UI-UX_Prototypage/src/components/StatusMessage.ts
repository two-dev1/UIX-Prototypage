import { escapeHtml } from "../utils/html.ts";

/** Rend un état neutre, vide ou de chargement. */
export function StatusMessage(
  message: string,
  variant: "loading" | "empty" = "loading",
): string {
  const role = variant === "empty" ? "status" : "status";
  return `<p class="status" role="${role}">${escapeHtml(message)}</p>`;
}

/** Rend un état d’erreur accompagné d’une action de nouvelle tentative. */
export function ErrorMessage(message: string): string {
  return `
    <div class="status status--error" role="alert">
      <p>${escapeHtml(message)}</p>
      <button type="button" class="button" id="retry">Réessayer</button>
    </div>
  `;
}
