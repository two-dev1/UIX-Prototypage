import { requireAuth } from "../app.ts";
import { mockGifs } from "../data/mockCommunity.ts";
import { getCurrentUser, getPosts, updatePost } from "../store.ts";
import type { CommunityComment } from "../types.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";
import { Avatar } from "./PostCard.ts";
import { openSheet } from "./Sheet.ts";

function Gif(id: string, small = false, selected = false): string {
  const gif = mockGifs.find((item) => item.id === id) ?? mockGifs[0];
  return `<span class="gif${small ? " gif--sm" : ""}${selected ? " is-selected" : ""}" style="--gif-bg:${gif.bg};--gif-fg:${gif.fg}" role="img" aria-label="GIF ${escapeHtml(gif.label)}"><span>${escapeHtml(gif.label)}</span></span>`;
}

function Comment(comment: CommunityComment): string {
  return `<article class="comment">
    ${Avatar(comment.author, "md")}
    <div class="comment__content">
      <p class="h2">${escapeHtml(comment.author)}${comment.replyTo ? ` <span class="caption muted">→ ${escapeHtml(comment.replyTo)}</span>` : ""}</p>
      ${comment.text ? `<p class="body">${escapeHtml(comment.text)}</p>` : ""}
      ${comment.gif ? Gif(comment.gif) : ""}
      <button type="button" class="comment__reply" data-action="reply" data-author="${escapeHtml(comment.author)}">Répondre</button>
    </div>
  </article>`;
}

/** Feuille « QFAP/Commentaires » avec réponses et GIFs boilerplate. */
export function openComments(postId: string, onChange: () => void): void {
  const post = getPosts().find((item) => item.id === postId);
  if (!post) return;
  const user = getCurrentUser();
  let replyTo = "";
  let gif = "";

  const list = (comments: CommunityComment[]): string =>
    comments.length > 0
      ? comments.map(Comment).join("")
      : `<p class="status">Aucun commentaire pour l’instant. Lance la discussion !</p>`;

  const sheet = openSheet("Commentaires", `<div class="stack stack--20" data-comment-list>${list(post.comments)}</div>`, {
    className: "sheet--comments",
    footer: `<form class="comment-composer" data-comment-form>
      <p class="comment-composer__reply" data-reply-banner hidden><span></span><button type="button" class="comment__reply" data-action="cancel-reply">Annuler</button></p>
      <div class="gif-picker" data-gif-picker hidden>${mockGifs
        .map((item) => `<button type="button" data-action="pick-gif" data-gif="${item.id}" aria-label="GIF ${escapeHtml(item.label)}">${Gif(item.id, true)}</button>`)
        .join("")}</div>
      <div class="comment-composer__row">
        ${Avatar(user?.name ?? "?", "md")}
        <label class="visually-hidden" for="comment-input">Ajouter un commentaire</label>
        <input id="comment-input" class="field field--comment" type="text" maxlength="280" placeholder="Ajouter un commentaire.." autocomplete="off" enterkeyhint="send">
        <button type="button" class="icon-button" data-action="toggle-gif" aria-label="Ajouter un GIF" aria-expanded="false">${icon("gif")}</button>
        <button type="submit" class="icon-button" aria-label="Envoyer">${icon("send")}</button>
      </div>
    </form>`,
    actions: {
      reply: (target) => {
        replyTo = target.dataset.author ?? "";
        const banner = sheet.element.querySelector<HTMLElement>("[data-reply-banner]");
        if (banner) {
          banner.hidden = false;
          banner.querySelector("span")!.textContent = `Réponse à ${replyTo}`;
        }
        sheet.element.querySelector<HTMLInputElement>("#comment-input")?.focus();
      },
      "cancel-reply": () => {
        replyTo = "";
        const banner = sheet.element.querySelector<HTMLElement>("[data-reply-banner]");
        if (banner) banner.hidden = true;
      },
      "toggle-gif": (target) => {
        const picker = sheet.element.querySelector<HTMLElement>("[data-gif-picker]");
        if (!picker) return;
        picker.hidden = !picker.hidden;
        target.setAttribute("aria-expanded", String(!picker.hidden));
      },
      "pick-gif": (target) => {
        gif = gif === target.dataset.gif ? "" : (target.dataset.gif ?? "");
        sheet.element.querySelectorAll<HTMLElement>("[data-action='pick-gif']").forEach((button) => {
          button.querySelector(".gif")?.classList.toggle("is-selected", button.dataset.gif === gif);
        });
      },
    },
  });

  const form = sheet.element.querySelector<HTMLFormElement>("[data-comment-form]");
  form?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const input = sheet.element.querySelector<HTMLInputElement>("#comment-input");
      const text = input?.value.trim() ?? "";
      if (!text && !gif) return;
      if (!requireAuth(`/share/${postId}`)) return;
      const comment: CommunityComment = {
        id: `comment-${Date.now()}`,
        author: getCurrentUser()?.name ?? "Utilisateur",
        text,
        gif: gif || undefined,
        replyTo: replyTo || undefined,
        createdAt: new Date().toISOString(),
      };
      const updated = updatePost(postId, (item) => item.comments.push(comment));
      if (!updated) return;
      const listHost = sheet.element.querySelector<HTMLElement>("[data-comment-list]");
      if (listHost) listHost.innerHTML = list(updated.comments);
      listHost?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
      if (input) input.value = "";
      gif = "";
      replyTo = "";
      sheet.element.querySelectorAll(".gif.is-selected").forEach((item) => item.classList.remove("is-selected"));
      const banner = sheet.element.querySelector<HTMLElement>("[data-reply-banner]");
      if (banner) banner.hidden = true;
      onChange();
    },
    { signal: sheet.signal },
  );
}
