export type AuthMode = "login" | "register" | "forgot" | "reset";

export type AppRoute =
  | { type: "tutorial" }
  | { type: "start" }
  | { type: "auth"; mode: AuthMode }
  | { type: "home" }
  | { type: "event"; id: string }
  | { type: "tickets" }
  | { type: "community" }
  | { type: "share"; postId: string }
  | { type: "profile" }
  | { type: "profile-edit" }
  | { type: "outs" }
  | { type: "favorites" }
  | { type: "categories" }
  | { type: "camera" };

/** Convertit le hash en route typée sans dépendance externe. */
export function readRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#/, "") || "/home";
  const [first = "", second = ""] = hash
    .split("?")[0]
    .split("/")
    .filter((segment) => segment.length > 0);

  switch (first) {
    case "tutorial":
    case "welcome":
      return { type: "tutorial" };
    case "start":
      return { type: "start" };
    case "auth":
      return {
        type: "auth",
        mode: second === "register" || second === "forgot" || second === "reset" ? second : "login",
      };
    case "event":
      return second ? { type: "event", id: decodeURIComponent(second) } : { type: "home" };
    case "share":
      return second
        ? { type: "share", postId: decodeURIComponent(second) }
        : { type: "community" };
    case "tickets":
      return { type: "tickets" };
    case "community":
      return { type: "community" };
    case "profile":
      return second === "edit" ? { type: "profile-edit" } : { type: "profile" };
    case "outs":
      return { type: "outs" };
    case "favorites":
      return { type: "favorites" };
    case "categories":
      return { type: "categories" };
    case "camera":
      return { type: "camera" };
    default:
      return { type: "home" };
  }
}

type RouteListener = () => void;

let listener: RouteListener | undefined;
let inAppDepth = 0;

/** Branche le rendu sur les changements de hash. */
export function startRouter(onChange: RouteListener): void {
  listener = onChange;
  window.addEventListener("hashchange", () => {
    inAppDepth++;
    onChange();
  });
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const target = `#${path}`;
  if (options.replace) {
    window.history.replaceState(null, "", target);
    listener?.();
    return;
  }
  if (window.location.hash === target) {
    listener?.();
    return;
  }
  window.location.hash = path;
}

/** Retour arrière : historique interne si disponible, sinon route de repli. */
export function goBack(fallback = "/home"): void {
  if (inAppDepth > 0) {
    inAppDepth -= 2; // le hashchange provoqué par back() réincrémente le compteur
    window.history.back();
    return;
  }
  navigate(fallback, { replace: true });
}

export function currentPath(): string {
  return window.location.hash.replace(/^#/, "") || "/home";
}
