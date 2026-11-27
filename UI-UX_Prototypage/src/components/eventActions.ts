import { requireAuth, toast, type ActionMap } from "../app.ts";
import { navigate } from "../router.ts";
import { toggleEventLike, toggleFavorite } from "../store.ts";
import type { ParisEvent } from "../types.ts";
import { baseLikes, getEventAddress } from "../utils/events.ts";
import { asText } from "../utils/html.ts";
import { iconSvg } from "../utils/icons.ts";

/** Cache mémoire partagé entre l'accueil, le détail et les favoris. */
export const eventCache = new Map<string, ParisEvent>();

export function cacheEvents(events: ParisEvent[]): void {
  events.forEach((event) => eventCache.set(asText(event.id), event));
}

export async function shareEvent(event: ParisEvent | undefined): Promise<void> {
  const title = asText(event?.title) || "Sortie OUTRS";
  const url = event ? `${location.origin}${location.pathname}#/event/${encodeURIComponent(event.id)}` : location.href;
  const text = event ? `${title} — ${getEventAddress(event)}` : title;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* Partage annulé */
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast("Lien copié dans le presse-papier");
  } catch {
    toast("Partage indisponible sur cet appareil");
  }
}

/** Actions communes des cartes événement (mise à jour ciblée, sans re-rendu complet). */
export function eventCardActions(options: { onUnsave?: (id: string) => void } = {}): ActionMap {
  return {
    "open-event": (target) => navigate(`/event/${encodeURIComponent(target.dataset.id ?? "")}`),
    "share-event": (target) => void shareEvent(eventCache.get(target.dataset.id ?? "")),
    "save-event": (target) => {
      const id = target.dataset.id ?? "";
      if (!requireAuth()) return;
      const saved = toggleFavorite(id);
      target.setAttribute("aria-pressed", String(saved));
      target.setAttribute("aria-label", saved ? "Retirer des favoris" : "Enregistrer");
      const holder = target.querySelector(".icon");
      if (holder) holder.innerHTML = iconSvg(saved ? "save-green" : "save-white");
      toast(saved ? "Ajouté à tes favoris" : "Retiré de tes favoris");
      if (!saved) options.onUnsave?.(id);
    },
    "like-event": (target) => {
      const id = target.dataset.id ?? "";
      if (!requireAuth()) return;
      const liked = toggleEventLike(id);
      target.classList.toggle("is-active", liked);
      target.setAttribute("aria-pressed", String(liked));
      const count = target.querySelector("[data-count]");
      if (count) count.textContent = String(baseLikes(id) + (liked ? 1 : 0));
    },
  };
}
