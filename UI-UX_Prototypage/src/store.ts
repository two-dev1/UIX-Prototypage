import type { CommunityPost, LocalUser, Ticket } from "./types.ts";

/** Wrapper localStorage sécurisé : aucune erreur de stockage ne casse l’application. */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Le stockage peut être indisponible en navigation privée.
  }
}

export function getCurrentUser(): LocalUser | null {
  return readStorage<LocalUser | null>("outrs-user", null);
}

export function setCurrentUser(user: LocalUser | null): void {
  if (user) writeStorage("outrs-user", user);
  else removeStorage("outrs-user");
}

export function getFavorites(): string[] {
  return readStorage<string[]>("outrs-favorites", []);
}

export function toggleFavorite(eventId: string): boolean {
  const favorites = getFavorites();
  const exists = favorites.includes(eventId);
  const next = exists
    ? favorites.filter((id) => id !== eventId)
    : [...favorites, eventId];
  writeStorage("outrs-favorites", next);
  return !exists;
}

export function getTickets(): Ticket[] {
  return readStorage<Ticket[]>("outrs-tickets", []);
}

export function addTicket(ticket: Ticket): void {
  writeStorage("outrs-tickets", [...getTickets(), ticket]);
}

export function getPosts(): CommunityPost[] {
  return readStorage<CommunityPost[]>("outrs-posts", []);
}

export function setPosts(posts: CommunityPost[]): void {
  writeStorage("outrs-posts", posts);
}

export function getOuts(): string[] {
  return readStorage<string[]>("outrs-outs", ["Explorateur"]);
}

export function addOut(category: string): void {
  const outs = getOuts();
  if (!outs.includes(category)) writeStorage("outrs-outs", [...outs, category]);
}

export function getScore(): number {
  return readStorage<number>("outrs-score", 0);
}

export function addScore(points: number): number {
  const score = getScore() + points;
  writeStorage("outrs-score", score);
  return score;
}

export function getFollowedOrganizers(): string[] {
  return readStorage<string[]>("outrs-followed", []);
}

export function toggleFollowedOrganizer(name: string): boolean {
  const followed = getFollowedOrganizers();
  const exists = followed.includes(name);
  writeStorage(
    "outrs-followed",
    exists ? followed.filter((item) => item !== name) : [...followed, name],
  );
  return !exists;
}
