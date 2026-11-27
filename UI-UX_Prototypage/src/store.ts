import { mockCommunityPosts } from "./data/mockCommunity.ts";
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

/* ---------- Utilisateur ---------- */

export function getCurrentUser(): LocalUser | null {
  return readStorage<LocalUser | null>("outrs-user", null);
}

export function setCurrentUser(user: LocalUser | null): void {
  if (user) writeStorage("outrs-user", user);
  else removeStorage("outrs-user");
}

export function isOnboarded(): boolean {
  return readStorage<boolean>("outrs-onboarding-done", false);
}

export function setOnboarded(): void {
  writeStorage("outrs-onboarding-done", true);
}

/* ---------- Favoris ---------- */

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

/* ---------- Likes d'événements ---------- */

export function getLikedEvents(): string[] {
  return readStorage<string[]>("outrs-event-likes", []);
}

export function toggleEventLike(eventId: string): boolean {
  const liked = getLikedEvents();
  const exists = liked.includes(eventId);
  writeStorage(
    "outrs-event-likes",
    exists ? liked.filter((id) => id !== eventId) : [...liked, eventId],
  );
  return !exists;
}

/* ---------- Billets ---------- */

export function getTickets(): Ticket[] {
  return readStorage<Ticket[]>("outrs-tickets", []);
}

export function addTicket(ticket: Ticket): void {
  writeStorage("outrs-tickets", [...getTickets(), ticket]);
}

/** Supprime uniquement le billet : le sticker et le score débloqués sont conservés. */
export function removeTicket(ticketId: string): void {
  writeStorage(
    "outrs-tickets",
    getTickets().filter((ticket) => ticket.id !== ticketId),
  );
}

/* ---------- Communauté ---------- */

const POSTS_SEED_VERSION = 2;

export function getPosts(): CommunityPost[] {
  if (readStorage<number>("outrs-posts-seed", 0) < POSTS_SEED_VERSION) {
    const own = readStorage<CommunityPost[]>("outrs-posts", []).filter(
      (post) => !mockCommunityPosts.some((mock) => mock.id === post.id),
    );
    writeStorage("outrs-posts", [...own, ...mockCommunityPosts]);
    writeStorage("outrs-posts-seed", POSTS_SEED_VERSION);
  }
  return readStorage<CommunityPost[]>("outrs-posts", []);
}

export function setPosts(posts: CommunityPost[]): boolean {
  return writeStorage("outrs-posts", posts);
}

export function updatePost(
  postId: string,
  update: (post: CommunityPost) => void,
): CommunityPost | null {
  const posts = getPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return null;
  update(post);
  setPosts(posts);
  return post;
}

/* ---------- Outs (stickers) & score ---------- */

export function getOuts(): string[] {
  return readStorage<string[]>("outrs-outs", ["Explorateur"]);
}

export function addOut(category: string): boolean {
  const outs = getOuts();
  if (outs.includes(category)) return false;
  writeStorage("outrs-outs", [...outs, category]);
  return true;
}

export function getScore(): number {
  return readStorage<number>("outrs-score", 0);
}

export function addScore(points: number): number {
  const score = getScore() + points;
  writeStorage("outrs-score", score);
  return score;
}

/* ---------- Organisateurs suivis ---------- */

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
