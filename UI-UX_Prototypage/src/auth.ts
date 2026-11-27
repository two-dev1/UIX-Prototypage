import type { AvatarId, LocalUser } from "./types.ts";
import { getCurrentUser, setCurrentUser, setOnboarded } from "./store.ts";

/** Connexion locale simulée : aucun appel serveur, l'utilisateur est stocké en localStorage. */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function registerUser(name: string, email: string): LocalUser {
  const cleanName = name.trim() || "Camille";
  const user: LocalUser = {
    id: `user-${Date.now()}`,
    name: cleanName,
    handle: toHandle(cleanName),
    email: email.trim(),
    avatar: "avatar-1",
  };
  setCurrentUser(user);
  setOnboarded();
  return user;
}

/** Accepte un email ou un nom d'utilisateur. */
export function loginUser(identifier: string): LocalUser {
  const value = identifier.trim();
  const isEmail = value.includes("@");
  const base = isEmail ? value.split("@")[0] : value;
  const name = capitalize(base.split(/[._-]/)[0] || "Camille");
  const user: LocalUser = {
    id: "local-user",
    name,
    handle: toHandle(base || name),
    email: isEmail ? value : "",
    avatar: "avatar-1",
  };
  setCurrentUser(user);
  setOnboarded();
  return user;
}

export function updateProfile(changes: {
  name?: string;
  handle?: string;
  email?: string;
  avatar?: AvatarId;
}): LocalUser | null {
  const user = getCurrentUser();
  if (!user) return null;
  const next: LocalUser = {
    ...user,
    name: changes.name?.trim() || user.name,
    handle: changes.handle?.trim() ? toHandle(changes.handle) : user.handle,
    email: changes.email?.trim() || user.email,
    avatar: changes.avatar ?? user.avatar,
  };
  setCurrentUser(next);
  return next;
}

export function logoutUser(): void {
  setCurrentUser(null);
}

function toHandle(value: string): string {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._]/g, ".");
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}
