import type { LocalUser } from "./types.ts";
import { getCurrentUser, setCurrentUser, writeStorage } from "./store.ts";

/** Détermine si une action engageante peut être effectuée. */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function registerUser(name: string, email: string): LocalUser {
  const handle = `@${name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, ".")}`;
  const user: LocalUser = {
    id: `user-${Date.now()}`,
    name,
    handle,
    email,
  };
  setCurrentUser(user);
  writeStorage("outrs-onboarding-done", true);
  return user;
}

export function loginUser(email: string): LocalUser {
  const name = email.includes("camille")
    ? "Camille"
    : email.split("@")[0] || "Utilisateur";
  const user: LocalUser = {
    id: "local-user",
    name,
    handle: email.includes("camille")
      ? "@camille.dl"
      : `@${name.toLowerCase()}`,
    email,
  };
  setCurrentUser(user);
  writeStorage("outrs-onboarding-done", true);
  return user;
}

export function logoutUser(): void {
  setCurrentUser(null);
}
