import "./style.css"
import { getEvents } from "./api.ts"
import { renderEventCard } from "./render.ts"
import type { ParisEvent } from "./types.ts"

const app = document.querySelector("#app")
if (!(app instanceof HTMLElement)) {
  throw new Error("Élément #app introuvable.")
}

app.innerHTML = `
  <header class="header">
    <p class="header__kicker">Ville de Paris</p>
    <h1>Que faire à Paris&nbsp;?</h1>
    <p class="header__intro">Une sélection d'événements proposés par la Ville de Paris.</p>
  </header>
  <main id="contenu" aria-live="polite"></main>
`

const content = findContent(app)

let requestId = 0

function findContent(root: HTMLElement): HTMLElement {
  const found = root.querySelector("#contenu")
  if (!(found instanceof HTMLElement)) {
    throw new Error("Zone de contenu introuvable.")
  }
  return found
}

void loadEvents()

async function loadEvents(): Promise<void> {
  const currentRequest = ++requestId
  showLoading()

  try {
    const events = await getEvents({ limit: 20, offset: 0 })
    if (currentRequest !== requestId) return
    showEvents(events)
  } catch (error) {
    if (currentRequest !== requestId) return
    const message =
      error instanceof Error
        ? error.message
        : "Une erreur inattendue s'est produite."
    showError(message)
  }
}

function showLoading(): void {
  content.innerHTML = `
    <p class="status" role="status">Chargement des événements…</p>
  `
}

function showError(message: string): void {
  content.innerHTML = `
    <div class="status status--error" role="alert">
      <p>${escapeText(message)}</p>
      <button type="button" id="retry">Réessayer</button>
    </div>
  `

  const retry = content.querySelector("#retry")
  if (retry instanceof HTMLButtonElement) {
    retry.addEventListener("click", () => {
      void loadEvents()
    })
  }
}

function showEvents(events: ParisEvent[]): void {
  if (events.length === 0) {
    content.innerHTML = `
      <p class="status" role="status">Aucun événement</p>
    `
    return
  }

  content.innerHTML = `
    <p class="count">${events.length} événements</p>
    <ul class="grid">
      ${events.map((event) => `<li>${renderEventCard(event)}</li>`).join("")}
    </ul>
  `
  replaceBrokenImages()
}

/** Remplace une image qui ne charge pas par le même repli que si elle est absente. */
function replaceBrokenImages(): void {
  const images = content.querySelectorAll("img")
  images.forEach((img) => {
    img.addEventListener("error", () => {
      const fallback = document.createElement("div")
      fallback.className = "card__fallback"
      fallback.textContent = "Image indisponible"
      img.replaceWith(fallback)
    })
  })
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
