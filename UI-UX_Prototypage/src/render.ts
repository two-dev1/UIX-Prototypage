import type { ParisEvent } from "./types.ts"

const LEAD_MAX_LENGTH = 120

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

/** Carte d'un événement, prête à être insérée dans la grille. */
export function renderEventCard(event: ParisEvent): string {
  const title = asText(event.title) || "Événement sans titre"
  const lead = truncate(toPlainText(event.lead_text), LEAD_MAX_LENGTH)
  const place = formatPlace(event)
  const price = formatPrice(event.price_type)
  const priceClass =
    asText(event.price_type).toLowerCase() === "gratuit"
      ? "card__price card__price--free"
      : "card__price"

  return `
    <article class="card" data-id="${escapeHtml(asText(event.id))}">
      ${renderCover(event, title)}
      <div class="card__body">
        ${price ? `<p class="${priceClass}">${escapeHtml(price)}</p>` : ""}
        <h2 class="card__title">${escapeHtml(title)}</h2>
        ${renderDates(event)}
        ${place ? `<p class="card__place">${escapeHtml(place)}</p>` : ""}
        ${lead ? `<p class="card__lead">${escapeHtml(lead)}</p>` : ""}
        ${renderLink(event.url, title)}
      </div>
    </article>
  `
}

/** Convertit le HTML éventuel de l'API en texte brut. */
function toPlainText(value: string | null): string {
  const raw = asText(value)
  if (!raw) return ""

  const withSpaces = raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
  const documentFragment = new DOMParser().parseFromString(withSpaces, "text/html")
  return (documentFragment.body.textContent ?? "").replace(/\s+/g, " ").trim()
}

function renderCover(event: ParisEvent, title: string): string {
  const alt = asText(event.cover_alt) || title
  const src = asText(event.cover_url)

  if (!src) {
    return `<div class="card__media">${renderFallback(alt)}</div>`
  }

  return `
    <div class="card__media">
      <img
        src="${escapeHtml(src)}"
        alt="${escapeHtml(alt)}"
        loading="lazy"
        decoding="async"
      >
    </div>
  `
}

function renderFallback(alt: string): string {
  return `<div class="card__fallback" role="img" aria-label="${escapeHtml(alt)}">Image indisponible</div>`
}

function renderDates(event: ParisEvent): string {
  const start = parseDate(event.date_start)
  const end = parseDate(event.date_end)

  if (start && end && !isSameDay(start, end)) {
    return `
      <p class="card__dates">
        Du <time datetime="${escapeHtml(asText(event.date_start))}">${escapeHtml(dateFormatter.format(start))}</time>
        au <time datetime="${escapeHtml(asText(event.date_end))}">${escapeHtml(dateFormatter.format(end))}</time>
      </p>
    `
  }

  const single = start ?? end
  const iso = start ? event.date_start : event.date_end
  if (single && iso) {
    return `<p class="card__dates"><time datetime="${escapeHtml(iso)}">${escapeHtml(dateFormatter.format(single))}</time></p>`
  }

  const description = truncate(toPlainText(event.date_description), LEAD_MAX_LENGTH)
  if (!description) return ""
  return `<p class="card__dates">${escapeHtml(description)}</p>`
}

function renderLink(url: string | null, title: string): string {
  const href = asText(url)
  if (!isHttpUrl(href)) return ""

  const label = `En savoir plus sur ${title}`
  return `
    <a
      class="card__link"
      href="${escapeHtml(href)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeHtml(label)}"
    >En savoir plus</a>
  `
}

function formatPlace(event: ParisEvent): string {
  return [asText(event.address_name), asText(event.address_city)]
    .filter((part) => part.length > 0)
    .join(" · ")
}

function formatPrice(price: string | null): string {
  const text = asText(price)
  if (!text) return ""
  return text.charAt(0).toLocaleUpperCase("fr-FR") + text.slice(1)
}

function parseDate(value: string | null): Date | null {
  const text = asText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const slice = text.slice(0, maxLength)
  const lastSpace = slice.lastIndexOf(" ")
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}

/** Empêche l'injection quand on construit le HTML à la main. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function asText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}
