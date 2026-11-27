/**
 * Authentification Supabase (e-mail + mot de passe) et profil (table `profiles`).
 * La session est gérée par supabase-js ; un instantané non sensible du profil
 * est gardé en localStorage pour les vérifications synchrones de l'interface.
 */
import type { AuthError as SupabaseAuthError, PostgrestError, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase.ts";
import type { AvatarId, LocalUser } from "./types.ts";
import { getCurrentUser, setCurrentUser, setGuestSession } from "./store.ts";

export class AuthError extends Error {
  readonly field?: string;
  readonly status: number;

  constructor(message: string, status = 400, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export const PASSWORD_MIN = 8;

/** Messages d'erreur Supabase traduits pour l'interface. */
function translate(error: SupabaseAuthError | PostgrestError): AuthError {
  const code = "code" in error ? String(error.code ?? "") : "";
  const message = error.message ?? "";
  if (code === "user_already_exists" || /already registered/i.test(message))
    return new AuthError("Un compte existe déjà avec cette adresse mail.", 409, "email");
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message))
    return new AuthError("E-mail ou mot de passe incorrect.", 401);
  if (code === "weak_password") return new AuthError(`Mot de passe trop faible (${PASSWORD_MIN} caractères minimum).`, 400, "password");
  if (code === "email_address_invalid" || /invalid.*email|email.*invalid/i.test(message))
    return new AuthError("Adresse mail invalide.", 400, "email");
  if (code === "email_not_confirmed")
    return new AuthError("Confirme d’abord ton adresse via le lien reçu par e-mail.", 403, "email");
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || /rate limit/i.test(message))
    return new AuthError("Trop de tentatives. Réessaie dans quelques minutes.", 429);
  if (code === "same_password") return new AuthError("Le nouveau mot de passe doit être différent de l’ancien.", 400, "password");
  if (code === "23505") return new AuthError("Ce pseudonyme est déjà pris.", 409, "handle");
  if (code === "23514") return new AuthError("Valeur refusée (pseudo : 2 à 30 caractères a-z, 0-9, « . » ou « _ »).", 400, "handle");
  if (/fetch|network/i.test(message)) return new AuthError("Connexion au serveur impossible. Vérifie ta connexion.", 0);
  return new AuthError(message || "Une erreur est survenue.", 400);
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured)
    throw new AuthError("Supabase n’est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).", 500);
}

/** Construit l'utilisateur de l'app à partir du compte Supabase et de son profil. */
async function loadProfile(user: User): Promise<LocalUser> {
  const { data } = await supabase.from("profiles").select("name, handle, avatar").eq("id", user.id).maybeSingle();
  const fallbackName = String(
    user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Outer",
  );
  const profile: LocalUser = {
    id: user.id,
    name: data?.name ?? fallbackName,
    handle: data?.handle ?? fallbackName.toLowerCase(),
    email: user.email ?? "",
    avatar: (data?.avatar as AvatarId | undefined) ?? "avatar-1",
    provider: user.app_metadata?.provider === "google" ? "google" : "password",
  };
  setCurrentUser(profile);
  setGuestSession(false);
  return profile;
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export async function registerUser(name: string, email: string, password: string): Promise<LocalUser> {
  ensureConfigured();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw translate(error);
  if (!data.session || !data.user) {
    // La confirmation e-mail est encore activée dans le projet Supabase.
    throw new AuthError("Compte créé : confirme ton adresse via le lien reçu par e-mail, puis connecte-toi.", 202, "email");
  }
  return loadProfile(data.user);
}

export async function loginUser(email: string, password: string): Promise<LocalUser> {
  ensureConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw translate(error);
  return loadProfile(data.user);
}

/** Google : redirection OAuth via Supabase (retour sur l'app avec `?code=`, échangé au démarrage). */
export async function googleLogin(): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
  });
  if (error) throw translate(error);
  // Le navigateur part vers Google : la suite se passe au retour (initAuth).
}

export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    setCurrentUser(null);
  }
}

/** Vérifie le mot de passe actuel avant une opération sensible. */
async function verifyCurrentPassword(currentPassword: string): Promise<void> {
  const email = getCurrentUser()?.email;
  if (!email) throw new AuthError("Session expirée. Reconnecte-toi.", 401);
  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (error) throw new AuthError("Mot de passe actuel incorrect.", 403, "currentPassword");
}

export async function updateProfile(changes: {
  name?: string;
  handle?: string;
  email?: string;
  avatar?: AvatarId;
  currentPassword?: string;
}): Promise<LocalUser> {
  ensureConfigured();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AuthError("Session expirée. Reconnecte-toi.", 401);

  const patch: Record<string, string> = {};
  if (changes.name?.trim()) patch.name = changes.name.trim();
  if (changes.handle?.trim()) patch.handle = changes.handle.trim().replace(/^@/, "").toLowerCase();
  if (changes.avatar) patch.avatar = changes.avatar;
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", auth.user.id);
    if (error) throw translate(error);
  }

  const email = changes.email?.trim().toLowerCase();
  if (email && email !== auth.user.email) {
    await verifyCurrentPassword(changes.currentPassword ?? "");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw translate(error);
  }

  const { data: refreshed } = await supabase.auth.getUser();
  return loadProfile(refreshed.user ?? auth.user);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  ensureConfigured();
  await verifyCurrentPassword(currentPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw translate(error);
}

/** Envoie le lien « mot de passe oublié » (retour sur l'app, puis écran de nouveau mot de passe). */
export async function requestPasswordReset(email: string): Promise<void> {
  ensureConfigured();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw translate(error);
}

/** Définit le nouveau mot de passe après ouverture du lien de réinitialisation. */
export async function setNewPassword(password: string): Promise<LocalUser> {
  ensureConfigured();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw translate(error);
  return loadProfile(data.user);
}

/**
 * Au démarrage : récupère la session (y compris un retour de lien e-mail ou Google `?code=`)
 * et écoute les changements. `onRecovery` est appelé à l'ouverture d'un lien de réinitialisation.
 * Retourne `returned: true` si l'utilisateur revient d'une redirection (Google / e-mail),
 * et `error` si Google ou Supabase a refusé la connexion.
 */
export async function initAuth(onRecovery: () => void): Promise<{ returned: boolean; error?: string }> {
  const params = new URLSearchParams(window.location.search);
  const returned = params.has("code") || params.has("error");
  const error = params.get("error_description") ?? params.get("error") ?? undefined;
  if (!isSupabaseConfigured) {
    setCurrentUser(null);
    return { returned: false };
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") window.setTimeout(onRecovery, 0);
    if (event === "SIGNED_OUT" || !session) setCurrentUser(null);
  });
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) await loadProfile(data.session.user).catch(() => undefined);
  else setCurrentUser(null);
  // Retire `?code=` / `?error=` de l'URL après l'échange PKCE.
  if (returned) window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  return { returned, error: error ? error.replace(/\+/g, " ") : undefined };
}
