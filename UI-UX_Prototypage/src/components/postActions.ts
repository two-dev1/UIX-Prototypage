import { requireAuth, toast, type ActionMap } from "../app.ts";
import { updatePost } from "../store.ts";
import { icon } from "../utils/icons.ts";

/** Actions des cartes post (Outers, Profil) : mise à jour ciblée du bouton, sans re-rendu. */
export function postActions(): ActionMap {
  return {
    "like-post": (target) => {
      if (!requireAuth()) return;
      const post = updatePost(target.dataset.id ?? "", (item) => {
        item.liked = !item.liked;
        item.likes += item.liked ? 1 : -1;
      });
      if (!post) return;
      target.classList.toggle("is-active", post.liked);
      target.setAttribute("aria-pressed", String(post.liked));
      target.innerHTML = `${icon(post.liked ? "heart-purple" : "heart-white")}<span>${post.likes}</span>`;
    },
    "save-post": (target) => {
      if (!requireAuth()) return;
      const post = updatePost(target.dataset.id ?? "", (item) => {
        item.saved = !item.saved;
        item.saves = Math.max(0, (item.saves ?? 0) + (item.saved ? 1 : -1));
      });
      if (!post) return;
      target.classList.toggle("is-active", Boolean(post.saved));
      target.setAttribute("aria-pressed", String(Boolean(post.saved)));
      target.innerHTML = `${icon(post.saved ? "save-green" : "save-white")}<span>${post.saves ?? 0}</span>`;
    },
    "share-post": async (target) => {
      const id = target.dataset.id ?? "";
      const url = `${location.origin}${location.pathname}#/share/${encodeURIComponent(id)}`;
      try {
        if (navigator.share) await navigator.share({ title: "Post OUT75", url });
        else {
          await navigator.clipboard.writeText(url);
          toast("Lien du post copié");
        }
        const post = updatePost(id, (item) => {
          item.shares = (item.shares ?? 0) + 1;
        });
        const count = target.querySelector("span:last-child");
        if (post && count) count.textContent = String(post.shares);
      } catch {
        /* Partage annulé */
      }
    },
  };
}
