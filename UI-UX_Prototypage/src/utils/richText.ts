/**
 * Assainit le HTML des descriptions OpenData : seule une liste blanche de balises
 * de mise en forme est conservée, le reste est réduit à son texte.
 * Aucun attribut n'est recopié, sauf `href` http(s) sur les liens.
 */
const INLINE: Record<string, string> = { strong: "strong", b: "strong", em: "em", i: "em", u: "em" };
const BLOCK: Record<string, string> = { p: "p", ul: "ul", ol: "ol", li: "li", blockquote: "blockquote" };
const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;");
}

function safeHref(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, "https://quefaire.paris.fr/");
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? "");
  if (!(node instanceof Element)) return "";
  const tag = node.tagName.toLowerCase();
  const children = [...node.childNodes].map(serialize).join("");
  if (tag === "script" || tag === "style" || tag === "iframe" || tag === "img") return "";
  if (tag === "br") return "<br>";
  if (INLINE[tag]) return children.trim() ? `<${INLINE[tag]}>${children}</${INLINE[tag]}>` : children;
  if (BLOCK[tag]) return `<${BLOCK[tag]}>${children}</${BLOCK[tag]}>`;
  if (HEADINGS.has(tag)) return `<p class="rich__heading">${children}</p>`;
  if (tag === "a") {
    const href = safeHref(node.getAttribute("href"));
    return href
      ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${children}</a>`
      : children;
  }
  // div, span, section… : on garde le contenu, et les div deviennent des paragraphes.
  return tag === "div" ? `<p>${children}</p>` : children;
}

/** Retourne un HTML sûr et mis en forme ; chaîne vide si le contenu est vide. */
export function sanitizeRichText(html: string | null | undefined): string {
  let raw = typeof html === "string" ? html.trim() : "";
  if (!raw) return "";
  // Texte brut sans balise : chaque saut de ligne devient un paragraphe.
  if (!/<[a-z][\s\S]*>/i.test(raw))
    raw = raw
      .split(/\n{1,}/)
      .map((line) => `<p>${escapeText(line.trim())}</p>`)
      .join("");
  const documentFragment = new DOMParser().parseFromString(raw, "text/html");
  return [...documentFragment.body.childNodes]
    .map(serialize)
    .join("")
    .replace(/(<br>\s*)+(<\/p>)/g, "$2")
    .replace(/<p>(\s|&nbsp;| |<br>)*<\/p>/g, "")
    .trim();
}
