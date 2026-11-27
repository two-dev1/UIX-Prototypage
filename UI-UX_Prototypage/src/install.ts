/**
 * « Ajouter à l'écran d'accueil » (PWA).
 * - Chrome / Edge / Android : fenêtre d'installation native (`beforeinstallprompt`).
 * - iPhone / iPad (Safari) : pas d'API, on affiche la marche à suivre (Partager → Sur l'écran d'accueil).
 * - Autres navigateurs : instructions génériques.
 * Le bouton disparaît une fois l'app installée ou ouverte depuis l'écran d'accueil.
 */
import { toast, type ActionMap } from "./app.ts";
import { openSheet } from "./components/Sheet.ts";
import { readStorage, writeStorage } from "./store.ts";
import { icon } from "./utils/icons.ts";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "outrs-install-dismissed-until";
const DISMISS_DAYS = 14;

let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // on affiche notre propre bouton au bon moment
  deferredPrompt = event as BeforeInstallPromptEvent;
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  writeStorage("outrs-installed", true);
  document.querySelectorAll("[data-install-cta]").forEach((element) => element.remove());
  toast("OUT75 est installée sur ton écran d’accueil");
});

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** Le bouton est proposé tant que l'app n'est pas installée. */
export function canOfferInstall(): boolean {
  return !isStandalone() && !readStorage<boolean>("outrs-installed", false);
}

/** La bannière de l'accueil, elle, peut être masquée 14 jours. */
function bannerDismissed(): boolean {
  return Date.now() < readStorage<number>(DISMISS_KEY, 0);
}

export function InstallBanner(): string {
  if (!canOfferInstall() || bannerDismissed()) return "";
  return `<aside class="install-banner" data-install-cta aria-label="Installer l’application">
    <img class="install-banner__icon" src="/brand/out75-icon-192.png" alt="" width="56" height="56">
    <div class="install-banner__text">
      <p class="h2">Ajoute OUT75 à ton écran d’accueil</p>
      <p class="caption">Ouverture en un geste, plein écran, même hors connexion.</p>
    </div>
    <div class="install-banner__actions">
      <button type="button" class="button button--primary button--label" data-action="install-app">Installer</button>
      <button type="button" class="icon-button icon-button--sm" data-action="dismiss-install" aria-label="Masquer">${icon("cross")}</button>
    </div>
  </aside>`;
}

/** Bouton discret (profil, panneau desktop). */
export function InstallButton(className = "button button--outline button--block button--label"): string {
  if (!canOfferInstall()) return "";
  return `<button type="button" class="${className}" data-action="install-app" data-install-cta>${icon("gallery")} Ajouter à l’écran d’accueil</button>`;
}

async function install(): Promise<void> {
  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "dismissed") toast("Installation annulée : tu pourras la relancer depuis ton profil");
    return;
  }
  const steps = isIos()
    ? [
        "Ouvre OUT75 dans <strong>Safari</strong>.",
        "Touche le bouton <strong>Partager</strong> (carré avec une flèche vers le haut).",
        "Choisis <strong>Sur l’écran d’accueil</strong>, puis <strong>Ajouter</strong>.",
      ]
    : [
        "Ouvre le <strong>menu</strong> de ton navigateur (⋮ ou ⋯).",
        "Choisis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.",
        "Confirme : l’icône OUT75 apparaît avec tes autres apps.",
      ];
  openSheet(
    "Ajouter à l’écran d’accueil",
    `<div class="install-steps">
      <img src="/brand/out75-icon-192.png" alt="" width="72" height="72" class="install-banner__icon self-center">
      <ol class="install-steps__list">${steps.map((step) => `<li>${step}</li>`).join("")}</ol>
    </div>`,
    { footer: `<button type="button" class="button button--primary button--block button--label" data-action="close">J’ai compris</button>` },
  );
}

/** Actions à fusionner dans les écrans qui affichent un bouton d'installation. */
export function installActions(): ActionMap {
  return {
    "install-app": () => void install(),
    "dismiss-install": (target) => {
      writeStorage(DISMISS_KEY, Date.now() + DISMISS_DAYS * 86_400_000);
      target.closest("[data-install-cta]")?.remove();
    },
  };
}
