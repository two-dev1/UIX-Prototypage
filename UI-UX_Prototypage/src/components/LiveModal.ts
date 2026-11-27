import { openOverlay } from "../app.ts";
import { mockLiveChat, mockLives } from "../data/mockCommunity.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";
import { Avatar } from "./PostCard.ts";

/** Streaming vidéo factice (boilerplate) : image animée, compteur et chat simulé. */
export function openLive(liveId: string): void {
  const live = mockLives.find((item) => item.id === liveId) ?? mockLives[0];
  let viewers = live.viewers;
  let index = 0;
  const overlay = openOverlay(
    `<section class="live">
      <img class="live__video" src="${escapeHtml(live.image)}" alt="" decoding="async">
      <span class="live__shade" aria-hidden="true"></span>
      <div class="live__top">
        <div class="live__host">${Avatar(live.host)}<div class="stack stack--8"><span class="h2">${escapeHtml(live.host)}</span><span class="caption">${escapeHtml(live.place)}</span></div></div>
        <button type="button" class="icon-button" data-action="close" aria-label="Quitter le live">${icon("cross")}</button>
      </div>
      <div class="live__bottom">
        <div class="row"><span class="live__chip">LIVE</span><span class="live__viewers">${icon("users")}<span data-viewers>${viewers}</span></span></div>
        <div class="live__chat" data-chat aria-live="polite"></div>
      </div>
    </section>`,
    { variant: "dark", label: `Live de ${live.host}` },
  );
  const chat = overlay.element.querySelector<HTMLElement>("[data-chat]");
  const counter = overlay.element.querySelector<HTMLElement>("[data-viewers]");
  const timer = window.setInterval(() => {
    const [author, text] = mockLiveChat[index % mockLiveChat.length];
    index++;
    chat?.insertAdjacentHTML(
      "beforeend",
      `<p class="live__message"><strong>${escapeHtml(author)}</strong><span>${escapeHtml(text)}</span></p>`,
    );
    if (chat && chat.children.length > 6) chat.firstElementChild?.remove();
    viewers = Math.max(1, viewers + Math.round(Math.random() * 6 - 2));
    if (counter) counter.textContent = String(viewers);
  }, 1600);
  overlay.signal.addEventListener("abort", () => window.clearInterval(timer));
}
