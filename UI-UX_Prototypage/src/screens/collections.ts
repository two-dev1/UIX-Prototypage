/** Favoris (Figma « Events Enregistrés ») et Catégories (Figma « Categorie »). */
import { getEventsByIds } from "../api.ts";
import { mountScreen, openAuthGate, root } from "../app.ts";
import { isAuthenticated } from "../auth.ts";
import { AppScreen, TopBar, chromeActions } from "../components/chrome.ts";
import { EventCard, EventCardSkeleton } from "../components/EventCard.ts";
import { cacheEvents, eventCache, eventCardActions } from "../components/eventActions.ts";
import { navigate } from "../router.ts";
import { getFavorites, getLikedEvents } from "../store.ts";
import type { ParisEvent } from "../types.ts";
import { CATEGORIES } from "../utils/events.ts";
import { escapeHtml } from "../utils/html.ts";
import { fallbackImage, img } from "../utils/images.ts";

const emptyFavorites = `<li><div class="empty"><p class="h1">Aucun favori</p><p class="body">Touche le marque-page d’un événement pour le retrouver ici.</p><button type="button" class="button button--primary button--label" data-action="explore">Explorer Paris</button></div></li>`;

export function renderFavorites(): void {
  if (!isAuthenticated()) {
    navigate("/profile", { replace: true });
    openAuthGate("/favorites");
    return;
  }
  const ids = getFavorites();
  const signal = mountScreen(
    AppScreen(
      `${TopBar("Favoris")}<ul class="feed" id="favorites">${ids.length > 0 ? ids.slice(0, 2).map(() => `<li>${EventCardSkeleton()}</li>`).join("") : emptyFavorites}</ul>`,
      "profile",
    ),
    {
      ...chromeActions({ backFallback: "/profile" }),
      ...eventCardActions({
        onUnsave: (id) => {
          root.querySelector(`.card[data-id="${CSS.escape(id)}"]`)?.closest("li")?.remove();
          const list = root.querySelector("#favorites");
          if (list && list.children.length === 0) list.innerHTML = emptyFavorites;
        },
      }),
      explore: () => navigate("/home"),
    },
  );
  if (ids.length === 0) return;

  const render = (events: ParisEvent[]): void => {
    const list = root.querySelector("#favorites");
    if (!list) return;
    const liked = new Set(getLikedEvents());
    list.innerHTML =
      events.length > 0
        ? events.map((event) => `<li>${EventCard(event, { saved: true, liked: liked.has(event.id) })}</li>`).join("")
        : emptyFavorites;
  };

  const cached = ids.map((id) => eventCache.get(id)).filter((event): event is ParisEvent => Boolean(event));
  if (cached.length === ids.length) return render(cached);

  const controller = new AbortController();
  signal.addEventListener("abort", () => controller.abort());
  getEventsByIds(ids, controller.signal)
    .then((events) => {
      cacheEvents(events);
      if (!signal.aborted) render(events);
    })
    .catch((error: unknown) => {
      if (signal.aborted) return;
      const list = root.querySelector("#favorites");
      if (list)
        list.innerHTML = `<li><p class="status status--error">${escapeHtml(error instanceof Error ? error.message : "Erreur de chargement.")}</p></li>`;
    });
}

export function renderCategories(): void {
  const current = sessionStorage.getItem("outrs-active-category") ?? "";
  mountScreen(
    AppScreen(
      `${TopBar("Catégories")}
      <section class="stack stack--40">
        <button type="button" class="h2 self-start" data-action="pick" data-id="">Tout</button>
        <ul class="feed feed--16">
          ${CATEGORIES.map(
            (category) => `<li><button type="button" class="category-card${current === category.id ? " is-active" : ""}" data-action="pick" data-id="${escapeHtml(category.id)}">
              <span class="media media--category">${img(fallbackImage(category.id, 240), "", { width: 100, height: 90 })}</span>
              <span class="h1">${escapeHtml(category.label)}</span>
            </button></li>`,
          ).join("")}
        </ul>
      </section>`,
      "home",
      "screen--loose",
    ),
    {
      ...chromeActions(),
      pick: (target) => {
        const id = target.dataset.id ?? "";
        sessionStorage.setItem("outrs-category", id);
        sessionStorage.setItem("outrs-active-category", id);
        navigate("/home");
      },
    },
  );
}
