import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/utilities.css";

import { getEvents } from "./api.ts";
import { EventCard } from "./components/EventCard.ts";
import { Header } from "./components/Header.ts";
import { ErrorMessage, StatusMessage } from "./components/StatusMessage.ts";
import type { ParisEvent } from "./types.ts";
import {
  isHtmlButtonElement,
  isHtmlElement,
  requireElement,
} from "./utils/dom.ts";

const app = requireElement(document, "#app", isHtmlElement);

app.innerHTML = `
  ${Header("Que faire à Paris ?", "Une sélection d’événements proposés par la Ville de Paris.")}
  <main id="contenu" aria-live="polite"></main>
  <div class="bottom-bar-reserved" aria-hidden="true"></div>
`;

const content = requireElement(app, "#contenu", isHtmlElement);

let requestId = 0;

void loadEvents();

async function loadEvents(): Promise<void> {
  const currentRequest = ++requestId;
  showLoading();

  try {
    const events = await getEvents({ limit: 20, offset: 0 });
    if (currentRequest !== requestId) return;
    showEvents(events);
  } catch (error: unknown) {
    if (currentRequest !== requestId) return;
    const message =
      error instanceof Error
        ? error.message
        : "Une erreur inattendue s’est produite.";
    showError(message);
  }
}

function showLoading(): void {
  content.innerHTML = StatusMessage("Chargement des événements…");
}

function showError(message: string): void {
  content.innerHTML = ErrorMessage(message);

  const retry = content.querySelector("#retry");
  if (retry && isHtmlButtonElement(retry)) {
    retry.addEventListener("click", () => {
      void loadEvents();
    });
  }
}

function showEvents(events: ParisEvent[]): void {
  if (events.length === 0) {
    content.innerHTML = StatusMessage("Aucun événement", "empty");
    return;
  }

  content.innerHTML = `
    <p class="count">${events.length} événements</p>
    <ul class="grid">
      ${events.map((event) => `<li>${EventCard(event)}</li>`).join("")}
    </ul>
  `;
  replaceBrokenImages();
}

/** Remplace une image qui ne charge pas par un état de repli accessible. */
function replaceBrokenImages(): void {
  const images = content.querySelectorAll("img");
  images.forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        const fallback = document.createElement("div");
        fallback.className = "card__fallback";
        fallback.textContent = "Image indisponible";
        image.replaceWith(fallback);
      },
      { once: true },
    );
  });
}
