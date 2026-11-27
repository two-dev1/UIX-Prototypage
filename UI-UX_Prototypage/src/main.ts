import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/responsive.css";
import "./styles/utilities.css";

import { registerSW } from "virtual:pwa-register";
import "./install.ts"; // capte tôt l’événement d’installation PWA
import { rememberReturnPath, toast } from "./app.ts";
import { initAuth, isAuthenticated } from "./auth.ts";
import { currentPath, navigate, readRoute, startRouter, type AppRoute } from "./router.ts";
import { renderCamera } from "./screens/camera.ts";
import { renderCategories, renderFavorites } from "./screens/collections.ts";
import { renderCommunity } from "./screens/community.ts";
import { renderEventDetail } from "./screens/eventDetail.ts";
import { renderHome } from "./screens/home.ts";
import { finishEntry, renderAuth, renderStart, renderTutorial, showSplash } from "./screens/onboarding.ts";
import { renderOuts, renderProfile, renderProfileEdit } from "./screens/profile.ts";
import { renderTickets } from "./screens/tickets.ts";
import { isGuestSession, isTutorialDone } from "./store.ts";

const ENTRY_ROUTES: ReadonlyArray<AppRoute["type"]> = ["start", "auth", "tutorial"];

/** Parcours d'entrée : connexion proposée avant l'app, puis tutoriel (une fois). */
function guard(route: AppRoute): boolean {
  if (ENTRY_ROUTES.includes(route.type)) {
    const signedInOnEntry =
      isAuthenticated() && (route.type === "start" || (route.type === "auth" && route.mode !== "reset"));
    if (!signedInOnEntry) return true;
    navigate(isTutorialDone() ? "/home" : "/tutorial", { replace: true });
    return false;
  }
  if (!isAuthenticated() && !isGuestSession()) {
    rememberReturnPath(currentPath());
    navigate("/start", { replace: true });
    return false;
  }
  if (!isTutorialDone()) {
    rememberReturnPath(currentPath());
    navigate("/tutorial", { replace: true });
    return false;
  }
  return true;
}

function renderRoute(): void {
  const route = readRoute();
  if (!guard(route)) return;
  switch (route.type) {
    case "tutorial":
      return renderTutorial();
    case "start":
      return renderStart();
    case "auth":
      return renderAuth(route.mode);
    case "event":
      return renderEventDetail(route.id);
    case "tickets":
      return renderTickets();
    case "community":
      return renderCommunity();
    case "share":
      return renderCommunity(route.postId);
    case "profile":
      return renderProfile();
    case "profile-edit":
      return renderProfileEdit();
    case "outs":
      return renderOuts();
    case "favorites":
      return renderFavorites();
    case "categories":
      return renderCategories();
    case "camera":
      return renderCamera();
    case "home":
      return renderHome();
  }
}

async function boot(): Promise<void> {
  const splash = showSplash();
  // Session Supabase récupérée pendant le loader (retour Google, lien « mot de passe oublié »).
  const auth = await initAuth(() => navigate("/auth/reset", { replace: true }));
  startRouter(renderRoute);
  if (auth.error) toast(`Connexion refusée : ${auth.error}`, { duration: 5000 });
  if (auth.returned && isAuthenticated()) finishEntry();
  else if (!window.location.hash) navigate("/home", { replace: true });
  else renderRoute();
  await splash;
}

/* Notifications PWA (Bibliothèque UI · E) : nouvelle version et hors-ligne. */
const updateServiceWorker = registerSW({
  onNeedRefresh() {
    toast("Nouvelle version disponible", {
      action: { label: "Mettre à jour", run: () => void updateServiceWorker(true) },
    });
  },
});

window.addEventListener("offline", () => toast("Hors-ligne : données enregistrées", { duration: 4000 }));
window.addEventListener("online", () => toast("De retour en ligne"));

void boot();
