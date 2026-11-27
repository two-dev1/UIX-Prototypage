import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/utilities.css";

import { registerSW } from "virtual:pwa-register";
import { toast } from "./app.ts";
import { navigate, readRoute, startRouter } from "./router.ts";
import { renderCamera } from "./screens/camera.ts";
import { renderCategories, renderFavorites } from "./screens/collections.ts";
import { renderCommunity } from "./screens/community.ts";
import { renderEventDetail } from "./screens/eventDetail.ts";
import { renderHome } from "./screens/home.ts";
import { renderAuth, renderStart, renderWelcome, showSplash } from "./screens/onboarding.ts";
import { renderOuts, renderProfile, renderProfileEdit } from "./screens/profile.ts";
import { renderTickets } from "./screens/tickets.ts";
import { isOnboarded } from "./store.ts";

function renderRoute(): void {
  const route = readRoute();
  switch (route.type) {
    case "welcome":
      return renderWelcome();
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
  startRouter(renderRoute);
  if (!window.location.hash) navigate(isOnboarded() ? "/home" : "/welcome", { replace: true });
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
