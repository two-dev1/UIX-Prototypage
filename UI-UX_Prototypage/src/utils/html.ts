/** Échappe toutes les valeurs interpolées dans du HTML. */
export function escapeHtml(value: string | null | undefined): string {
  const text = typeof value === "string" ? value : "";
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Convertit une valeur optionnelle en chaîne nettoyée. */
export function asText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}
