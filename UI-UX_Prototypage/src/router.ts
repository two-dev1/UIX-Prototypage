export type AppRoute =
  | { type: "welcome" }
  | { type: "auth"; mode: "login" | "register" }
  | { type: "home" }
  | { type: "tickets" }
  | { type: "community" }
  | { type: "profile" }
  | { type: "event"; id: string }
  | { type: "share"; postId: string };

/** Convertit le hash en route typée sans dépendance externe. */
export function readRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#/, "") || "/home";
  const segments = hash.split("/").filter((segment) => segment.length > 0);

  if (segments[0] === "event" && segments[1])
    return { type: "event", id: decodeURIComponent(segments[1]) };
  if (segments[0] === "share" && segments[1])
    return { type: "share", postId: decodeURIComponent(segments[1]) };
  if (segments[0] === "welcome") return { type: "welcome" };
  if (segments[0] === "auth") {
    const mode = segments[1] === "register" ? "register" : "login";
    return { type: "auth", mode };
  }
  if (segments[0] === "tickets") return { type: "tickets" };
  if (segments[0] === "community") return { type: "community" };
  if (segments[0] === "profile") return { type: "profile" };
  return { type: "home" };
}

export function navigate(path: string): void {
  window.location.hash = path;
}
