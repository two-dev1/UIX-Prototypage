/** Outers (Figma « Social media » / « Comment ») : stories, lives factices, posts, commentaires. */
import { mountScreen, root } from "../app.ts";
import { AppScreen, TopBar, chromeActions } from "../components/chrome.ts";
import { openComments } from "../components/CommentsSheet.ts";
import { openLive } from "../components/LiveModal.ts";
import { PostCard } from "../components/PostCard.ts";
import { postActions } from "../components/postActions.ts";
import { mockLives } from "../data/mockCommunity.ts";
import { navigate } from "../router.ts";
import { getPosts } from "../store.ts";
import type { CommunityPost } from "../types.ts";
import { escapeHtml } from "../utils/html.ts";
import { iconSvg } from "../utils/icons.ts";

let query = "";

function filtered(posts: CommunityPost[]): CommunityPost[] {
  const value = query.toLowerCase();
  if (!value) return posts;
  return posts.filter((post) => `${post.author} ${post.text} ${post.eventTitle}`.toLowerCase().includes(value));
}

function feed(): string {
  const posts = filtered(getPosts());
  return posts.length > 0
    ? posts.map((post) => `<li>${PostCard(post)}</li>`).join("")
    : `<li><p class="status">Aucun post ne correspond à « ${escapeHtml(query)} ».</p></li>`;
}

function refreshFeed(): void {
  const list = root.querySelector("#post-feed");
  if (list) list.innerHTML = feed();
}

export function renderCommunity(openPostId?: string): void {
  mountScreen(
    AppScreen(
      `${TopBar("Outers")}
      <div class="h-scroll h-scroll--stories" role="list" aria-label="Stories et lives">
        <button type="button" class="story story--add" data-action="create" role="listitem" aria-label="Publier un post ou une story">${iconSvg("story-plus")}</button>
        ${mockLives
          .map(
            (live) => `<button type="button" class="story story--live" data-action="open-live" data-id="${live.id}" role="listitem" aria-label="Live de ${escapeHtml(live.host)} à ${escapeHtml(live.place)}">
              <img src="${escapeHtml(live.image.replace("w=720", "w=160"))}" alt="" width="64" height="64" loading="lazy" decoding="async"><span class="story__badge">LIVE</span>
            </button>`,
          )
          .join("")}
      </div>
      <h2 class="h2 center">Posts${query ? ` · « ${escapeHtml(query)} »` : ""}</h2>
      <ul class="feed feed--32" id="post-feed">${feed()}</ul>`,
      "community",
    ),
    {
      ...chromeActions({
        onSearch: (value) => {
          query = value;
          const title = root.querySelector("main > h2");
          if (title) title.textContent = query ? `Posts · « ${query} »` : "Posts";
          refreshFeed();
        },
      }),
      "open-live": (target) => openLive(target.dataset.id ?? ""),
      "open-comments": (target) => openComments(target.dataset.id ?? "", refreshFeed),
      ...postActions(),
    },
  );

  if (openPostId) {
    if (getPosts().some((post) => post.id === openPostId)) openComments(openPostId, refreshFeed);
    else navigate("/community", { replace: true });
  }
}
