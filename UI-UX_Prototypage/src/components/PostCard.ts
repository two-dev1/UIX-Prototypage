import type { CommunityPost } from "../types.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";
import { fallbackImage, img } from "../utils/images.ts";

export function Avatar(initial: string, size: "sm" | "md" = "sm"): string {
  return `<span class="avatar${size === "md" ? " avatar--md" : ""}" aria-hidden="true">${escapeHtml(initial.charAt(0).toUpperCase())}</span>`;
}

/** Carte « QFAP/Post card » : auteur, média masqué, infos, likes / commentaires / enregistrements / partages. */
export function PostCard(post: CommunityPost): string {
  const id = escapeHtml(post.id);
  const fallback = fallbackImage("Paris", 720);
  return `<article class="post" data-id="${id}">
    <div class="post__author">${Avatar(post.avatar || post.author)}<span>${escapeHtml(post.author)}</span></div>
    <button type="button" class="media media--post" data-action="open-comments" data-id="${id}" aria-label="Voir les commentaires">
      ${img(post.image || fallback, `Photo publiée par ${post.author}`, { fallback, width: 360, height: 193 })}
    </button>
    <div class="post__body">
      <p class="h2">${escapeHtml(post.eventTitle || "Post info")}</p>
      <p class="body">${escapeHtml(post.text)}</p>
    </div>
    <div class="post__actions">
      <button type="button" class="post__action${post.liked ? " is-active" : ""}" data-action="like-post" data-id="${id}" aria-pressed="${post.liked ? "true" : "false"}" aria-label="J’aime">${icon(post.liked ? "heart-purple" : "heart-white")}<span>${post.likes}</span></button>
      <button type="button" class="post__action" data-action="open-comments" data-id="${id}" aria-label="Commentaires">${icon("comment")}<span>${post.comments.length}</span></button>
      <button type="button" class="post__action${post.saved ? " is-active" : ""}" data-action="save-post" data-id="${id}" aria-pressed="${post.saved ? "true" : "false"}" aria-label="Enregistrer">${icon(post.saved ? "save-green" : "save-white")}<span>${post.saves ?? 0}</span></button>
      <button type="button" class="post__action" data-action="share-post" data-id="${id}" aria-label="Partager">${icon("send")}<span>${post.shares ?? 0}</span></button>
    </div>
  </article>`;
}
