/**
 * Noyau applicatif : montage des écrans, délégation des clics,
 * couches superposées (feuilles, plein écran), toasts et garde d'authentification.
 */
import { isAuthenticated } from "./auth.ts";
import { currentPath, navigate } from "./router.ts";
import { isHtmlElement, requireElement } from "./utils/dom.ts";
import { escapeHtml } from "./utils/html.ts";
import { icon } from "./utils/icons.ts";
import { randomPartyImage } from "./utils/images.ts";

export const root = requireElement(document, "#app", isHtmlElement);

type ActionHandler = (target: HTMLElement, event: Event) => void;
export type ActionMap = Record<string, ActionHandler>;

let screenController = new AbortController();

/** Remplace l'écran courant ; les écouteurs de l'écran précédent sont libérés. */
export function mountScreen(html: string, actions: ActionMap = {}): AbortSignal {
  screenController.abort();
  closeAllOverlays();
  screenController = new AbortController();
  root.innerHTML = html;
  window.scrollTo({ top: 0, behavior: "instant" });
  delegate(root, actions, screenController.signal);
  return screenController.signal;
}

/** Délégation : un seul écouteur par conteneur, routé via `data-action`. */
export function delegate(host: HTMLElement, actions: ActionMap, signal: AbortSignal): void {
  host.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-action]") : null;
      if (!target || !host.contains(target)) return;
      const handler = actions[target.dataset.action ?? ""];
      if (!handler) return;
      event.preventDefault();
      handler(target, event);
    },
    { signal },
  );
}

/* ---------- Couches superposées ---------- */

interface OverlayEntry {
  host: HTMLElement;
  controller: AbortController;
  previousFocus: Element | null;
  onClose?: () => void;
}

const overlays: OverlayEntry[] = [];
const overlayRoot = document.createElement("div");
overlayRoot.className = "overlay-root";
document.body.append(overlayRoot);

interface OverlayOptions {
  variant?: "sheet" | "center" | "top" | "full" | "dark";
  label: string;
  actions?: ActionMap;
  onClose?: () => void;
  dismissible?: boolean;
}

export interface OverlayHandle {
  element: HTMLElement;
  signal: AbortSignal;
  close: () => void;
}

export function openOverlay(html: string, options: OverlayOptions): OverlayHandle {
  const { variant = "sheet", label, actions = {}, onClose, dismissible = true } = options;
  const host = document.createElement("div");
  host.className = `overlay${variant === "sheet" ? "" : ` overlay--${variant}`}${variant === "dark" ? " overlay--full" : ""}`;
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", label);
  host.innerHTML = html;
  overlayRoot.append(host);
  document.body.classList.add("is-locked");

  const controller = new AbortController();
  const entry: OverlayEntry = { host, controller, previousFocus: document.activeElement, onClose };
  overlays.push(entry);

  const close = (): void => closeOverlay(entry);
  delegate(host, { close, ...actions }, controller.signal);
  if (dismissible) {
    host.addEventListener(
      "click",
      (event) => {
        if (event.target === host) close();
      },
      { signal: controller.signal },
    );
  }

  requestAnimationFrame(() => {
    const focusable = host.querySelector<HTMLElement>("[autofocus], input, textarea, button, [href]");
    focusable?.focus({ preventScroll: true });
  });

  return { element: host, signal: controller.signal, close };
}

function closeOverlay(entry: OverlayEntry, animate = true): void {
  const index = overlays.indexOf(entry);
  if (index === -1) return;
  overlays.splice(index, 1);
  entry.controller.abort();
  const finish = (): void => {
    entry.host.remove();
    if (overlays.length === 0) document.body.classList.remove("is-locked");
  };
  if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    entry.host.classList.add("is-closing");
    entry.host.querySelector(".sheet")?.classList.add("is-closing");
    window.setTimeout(finish, 180);
  } else finish();
  if (entry.previousFocus instanceof HTMLElement) entry.previousFocus.focus({ preventScroll: true });
  entry.onClose?.();
}

export function closeAllOverlays(): void {
  [...overlays].reverse().forEach((entry) => closeOverlay(entry, false));
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && overlays.length > 0) closeOverlay(overlays[overlays.length - 1]);
});

/* ---------- Toasts ---------- */

const toastHost = document.createElement("div");
toastHost.className = "toast-host";
toastHost.setAttribute("aria-live", "polite");
document.body.append(toastHost);

export function toast(
  message: string,
  options: { action?: { label: string; run: () => void }; duration?: number } = {},
): () => void {
  const element = document.createElement("div");
  element.className = "toast";
  element.setAttribute("role", "status");
  element.innerHTML = `<span>${escapeHtml(message)}</span>${
    options.action
      ? `<div class="toast__actions"><button type="button" class="button button--secondary" data-toast-action>${escapeHtml(options.action.label)}</button><button type="button" class="button button--ghost" data-toast-dismiss>Plus tard</button></div>`
      : ""
  }`;
  toastHost.append(element);
  const dismiss = (): void => element.remove();
  element.querySelector("[data-toast-dismiss]")?.addEventListener("click", dismiss);
  element.querySelector("[data-toast-action]")?.addEventListener("click", () => {
    options.action?.run();
    dismiss();
  });
  if (!options.action) window.setTimeout(dismiss, options.duration ?? 2600);
  return dismiss;
}

/* ---------- Mode invité : portail de connexion plein écran ---------- */

const RETURN_KEY = "outrs-return-to";

export function rememberReturnPath(path = currentPath()): void {
  sessionStorage.setItem(RETURN_KEY, path);
}

/** Lit l'écran de retour sans le consommer (conservé pendant la redirection Google). */
export function peekReturnPath(fallback = "/home"): string {
  return sessionStorage.getItem(RETURN_KEY) ?? fallback;
}

export function consumeReturnPath(fallback = "/home"): string {
  const path = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  return path && !path.startsWith("/auth") && !path.startsWith("/start") ? path : fallback;
}

/** Vérifie l'authentification avant une action engageante ; sinon ouvre le portail. */
export function requireAuth(returnPath?: string): boolean {
  if (isAuthenticated()) return true;
  openAuthGate(returnPath);
  return false;
}

/** Grand logo « 75 » rempli d'une photo d'événement tirée au hasard (soirée, concert, foule). */
export function BigMark(className = "", eager = false): string {
  return `<span class="logo-75 big-mark${className ? ` ${className}` : ""}" aria-hidden="true">
    <img src="${randomPartyImage()}" alt="" width="440" height="320" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>
  </span>`;
}

/**
 * Gabarit des écrans d'entrée (intro, connexion, inscription, tutoriel…).
 * Mobile : seul le formulaire est affiché. Desktop (≥ 1024 px) : écran coupé en deux,
 * panneau de marque OUT75 à gauche, formulaire à droite.
 */
export function entry(screen: string): string {
  return `<div class="entry">
    <aside class="entry__brand" aria-hidden="true">
      <span class="entry__logo">${icon("logo-text")}</span>
      ${BigMark("entry__mark", true)}
      <div class="entry__tagline">
        <p class="display display--violet">Bonjour, Paris.</p>
        <p class="body">Concerts, expos, théâtre, cinéma, sorties gratuites : toutes les sorties culturelles de Paris, et la communauté des Outers.</p>
      </div>
    </aside>
    ${screen}
  </div>`;
}

/** Page « Rejoins les Outers » : écran d'entrée et portail des actions engageantes. */
export function JoinPanel(options: { back: boolean }): string {
  return `<section class="fullscreen">
      <div class="fullscreen__head">
        ${options.back ? `<button type="button" class="icon-button" data-action="close" aria-label="Retour">${icon("back")}</button>` : ""}
        <span class="logo" aria-label="OUT75" role="img">${icon("logo-text")}</span>
      </div>
      <div class="join">
        ${BigMark("", true)}
        <div class="stack stack--12">
          <h1 class="display">Rejoins les Outers.</h1>
          <p class="body">Connecte-toi ou crée ton compte pour réserver, poster, commenter, liker et enregistrer tes sorties.</p>
        </div>
        <div class="stack stack--12">
        <button type="button" class="button button--primary button--block" data-action="gate-login">Se connecter</button>
        <button type="button" class="button button--secondary button--block" data-action="gate-register">Créer un compte</button>
        <button type="button" class="button button--ghost button--block button--label" data-action="${options.back ? "close" : "guest"}">Continuer en invité</button>
        <p class="caption muted center legal-links">En continuant, tu acceptes les <a href="/conditions.html">conditions d’utilisation</a> et la <a href="/confidentialite.html">politique de confidentialité</a>. <a href="/a-propos.html">À propos d’OUT75</a></p>
        </div>
      </div>
    </section>`;
}

export function openAuthGate(returnPath?: string): void {
  openOverlay(JoinPanel({ back: true }), {
    variant: "full",
    label: "Connexion requise",
    actions: {
      "gate-login": () => {
        rememberReturnPath(returnPath);
        navigate("/auth/login");
      },
      "gate-register": () => {
        rememberReturnPath(returnPath);
        navigate("/auth/register");
      },
    },
  });
}

/* ---------- Images : repli automatique ---------- */

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const fallback = image.dataset.fallback;
    if (fallback && image.src !== fallback) {
      image.src = fallback;
      delete image.dataset.fallback;
    } else image.style.visibility = "hidden";
  },
  true,
);
