import type { ParisEvent } from "../types.ts";
import { baseLikes, formatDateRange, formatPrice, toPlainText, truncate } from "../utils/events.ts";
import { asText, escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";
import { eventImage, img } from "../utils/images.ts";

interface EventCardOptions {
  saved?: boolean;
  liked?: boolean;
  /** Carte non cliquable (page détail). */
  static?: boolean;
  eager?: boolean;
}

/** Carte « QFAP/Event card » : média 16:10 masqué, titre 2 lignes + partage/favori, likes, prix. */
export function EventCard(event: ParisEvent, options: EventCardOptions = {}): string {
  const id = escapeHtml(asText(event.id));
  const title = asText(event.title) || "Événement sans titre";
  const dates = formatDateRange(event);
  const lead = truncate(toPlainText(event.lead_text), 180);
  const price = formatPrice(event);
  const image = eventImage(event);
  const likes = baseLikes(asText(event.id)) + (options.liked ? 1 : 0);
  const media = `<span class="media media--event">${img(image.src, image.alt, {
    fallback: image.fallback,
    width: 320,
    height: 193,
    eager: options.eager,
  })}</span>`;
  const open = (inner: string, extra = ""): string =>
    options.static
      ? `<span class="${extra}">${inner}</span>`
      : `<button type="button" class="${extra}" data-action="open-event" data-id="${id}">${inner}</button>`;

  return `<article class="card" data-id="${id}">
    <div class="card__open">
      ${options.static ? media : `<button type="button" class="card__open" data-action="open-event" data-id="${id}" aria-label="Voir ${escapeHtml(title)}" tabindex="-1">${media}</button>`}
      <div class="card__content">
        <div class="card__head">
          ${open(escapeHtml(title), "h1 card__title")}
          <span class="card__tools">
            <button type="button" class="icon-button" data-action="share-event" data-id="${id}" aria-label="Partager">${icon("send")}</button>
            <button type="button" class="icon-button" data-action="save-event" data-id="${id}" aria-pressed="${options.saved ? "true" : "false"}" aria-label="${options.saved ? "Retirer des favoris" : "Enregistrer"}">${icon(options.saved ? "save-green" : "save-white")}</button>
          </span>
        </div>
        ${dates ? `<p class="card__date">${escapeHtml(dates)}</p>` : ""}
        ${lead ? `<p class="body card__lead">${escapeHtml(lead)}</p>` : ""}
      </div>
    </div>
    <div class="card__footer">
      <button type="button" class="likes${options.liked ? " is-active" : ""}" data-action="like-event" data-id="${id}" aria-pressed="${options.liked ? "true" : "false"}">
        ${icon("heart-green")}<span data-count>${likes}</span><span class="visually-hidden"> j’aime</span>
      </button>
      <span class="price">${escapeHtml(price.label)}</span>
    </div>
  </article>`;
}

export function EventCardSkeleton(): string {
  return `<div class="skeleton" aria-hidden="true"><span class="media media--event is-loading"></span><span class="skeleton__line"></span><span class="skeleton__line"></span><span class="skeleton__line"></span></div>`;
}
