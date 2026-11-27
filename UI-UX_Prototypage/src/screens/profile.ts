/** Profil, Modifier le profil, Collection d'Outs (Figma « Profile », « Modifier le profil », « Outs collection »). */
import { changePassword, logoutUser, updateProfile } from "../auth.ts";
import { mountScreen, openAuthGate, requireAuth, toast } from "../app.ts";
import { AppScreen, TopBar, chromeActions } from "../components/chrome.ts";
import { openComments } from "../components/CommentsSheet.ts";
import { PostCard } from "../components/PostCard.ts";
import { postActions } from "../components/postActions.ts";
import { openSheet } from "../components/Sheet.ts";
import { OUTS_CATALOG, Sticker } from "../components/Sticker.ts";
import { InstallButton, canOfferInstall } from "../install.ts";
import { navigate } from "../router.ts";
import { getCurrentUser, getFollowedOrganizers, getOuts, getPosts, getScore, getTickets } from "../store.ts";
import type { AvatarId } from "../types.ts";
import { escapeHtml } from "../utils/html.ts";
import { avatarImg, icon } from "../utils/icons.ts";

function ProfileAvatar(avatar: AvatarId | undefined, name: string): string {
  return `<span class="avatar avatar--lg" aria-hidden="true">${avatar ? avatarImg(avatar) : escapeHtml(name.charAt(0).toUpperCase())}</span>`;
}

function Identity(name: string, handle: string): string {
  return `<div class="profile-head__id"><h2 class="display">${escapeHtml(name)}</h2><p class="caption">${escapeHtml(handle)}</p></div>`;
}

export function renderProfile(): void {
  const user = getCurrentUser();
  const outs = getOuts();
  const myPosts = user ? getPosts().filter((post) => post.authorId === user.id) : [];
  const score = getScore();
  const level = score >= 300 ? 3 : score >= 100 ? 2 : 1;

  mountScreen(
    AppScreen(
      `${TopBar("Profil")}
      <section class="stack stack--16">
        <div class="profile-head">
          <div class="profile-head__id">
            <h2 class="display">${escapeHtml(user?.name ?? "Invité")}</h2>
            <p class="caption">${escapeHtml(user?.handle ?? "mode invité")}</p>
            <div class="stats">
              <span class="stat"><strong>${getFollowedOrganizers().length}</strong>suivi</span>
              <span class="stat"><strong>0</strong>Abonnées</span>
              <span class="stat"><strong>${getTickets().length}</strong>Events</span>
            </div>
          </div>
          ${ProfileAvatar(user?.avatar, user?.name ?? "I")}
        </div>
        ${
          user
            ? `<button type="button" class="button button--primary button--block" data-action="edit">Modifier</button>`
            : `<button type="button" class="button button--primary button--block" data-action="login">Se connecter</button>`
        }
        <button type="button" class="button button--dark button--block button--label" data-action="favorites">${icon("save-green")} Événements enregistrés</button>
      </section>
      <section class="stack stack--20" aria-labelledby="outs-title">
        <div class="section-head"><h3 id="outs-title" class="h2">Mes outs</h3><button type="button" class="link link--underline" data-action="outs">Voir tout</button></div>
        <p class="caption muted">${score} points · Niveau ${level} · ${level >= 2 ? "-10 % débloqué sur ta prochaine sortie" : "Prochain avantage : -10 % dès 100 points"}</p>
        <div class="h-scroll h-scroll--32">${OUTS_CATALOG.map((out) => Sticker(out, outs.includes(out), "wide")).join("")}</div>
      </section>
      <section class="stack stack--20" aria-labelledby="posts-title">
        <div class="section-head"><h3 id="posts-title" class="h2">Mes posts</h3><button type="button" class="link link--underline" data-action="all-posts">Voir tout</button></div>
        ${
          myPosts.length > 0
            ? `<ul class="feed feed--32">${myPosts.slice(0, 2).map((post) => `<li>${PostCard(post)}</li>`).join("")}</ul>`
            : `<div class="empty"><p class="body">Aucun post publié.</p><button type="button" class="button button--secondary button--label" data-action="create">Publier une photo</button></div>`
        }
      </section>
      ${
        canOfferInstall()
          ? `<section class="stack stack--12" aria-labelledby="install-title"><h3 id="install-title" class="h2">Application</h3>${InstallButton()}</section>`
          : ""
      }
      ${
        user
          ? `<section class="stack stack--12" aria-labelledby="account-title">
              <h3 id="account-title" class="h2">Compte</h3>
              <button type="button" class="button button--outline button--block button--label" data-action="logout">${icon("logout")} Se déconnecter</button>
              <p class="caption muted center legal-links"><a href="/a-propos.html">À propos</a> · <a href="/confidentialite.html">Confidentialité</a> · <a href="/conditions.html">Conditions d’utilisation</a></p>
            </section>`
          : ""
      }`,
      "profile",
    ),
    {
      ...chromeActions(),
      edit: () => navigate("/profile/edit"),
      login: () => openAuthGate("/profile"),
      favorites: () => {
        if (requireAuth("/favorites")) navigate("/favorites");
      },
      outs: () => navigate("/outs"),
      "all-posts": () => navigate("/community"),
      "open-comments": (target) => openComments(target.dataset.id ?? "", () => undefined),
      ...postActions(),
      logout: confirmLogout,
    },
  );
}

/** Déconnexion avec confirmation : les données locales (billets, favoris, outs) restent sur l'appareil. */
function confirmLogout(): void {
  const sheet = openSheet(
    "Se déconnecter ?",
    `<p class="body">Tes billets, favoris et stickers restent enregistrés sur cet appareil.</p>`,
    {
      footer: `<button type="button" class="button button--primary button--block" data-action="confirm-logout">Se déconnecter</button>
        <button type="button" class="button button--ghost button--block button--label" data-action="close">Annuler</button>`,
      actions: {
        "confirm-logout": async () => {
          sheet.close();
          await logoutUser().catch(() => undefined);
          toast("Tu es déconnecté·e");
          navigate("/start", { replace: true });
        },
      },
    },
  );
}

export function renderProfileEdit(): void {
  const user = getCurrentUser();
  if (!user) {
    navigate("/profile", { replace: true });
    openAuthGate("/profile/edit");
    return;
  }
  let avatar: AvatarId = user.avatar ?? "avatar-1";
  const isOAuth = user.provider === "google";
  const signal = mountScreen(
    AppScreen(
      `${TopBar("Modifier le profil", { left: "back", search: false })}
      <form class="stack stack--40" id="profile-form" novalidate>
        <fieldset class="stack stack--16">
          <legend class="visually-hidden">Avatar</legend>
          <div class="avatar-choice" role="radiogroup" aria-label="Choisir un avatar">
            ${(["avatar-1", "avatar-2"] as const)
              .map(
                (id) =>
                  `<button type="button" class="avatar-choice__option${avatar === id ? " is-selected" : ""}" role="radio" aria-checked="${avatar === id}" data-action="avatar" data-id="${id}" aria-label="Avatar ${id.slice(-1)}">${avatarImg(id)}</button>`,
              )
              .join("")}
          </div>
          <p class="h2 lime center">Modifier l’image ou l’avatar</p>
        </fieldset>
        <div class="stack stack--8">
          <label class="inline-field"><span class="inline-field__label">Pseudonyme</span><input class="inline-field__input" name="handle" value="${escapeHtml(user.handle)}" placeholder="Nickname" autocomplete="nickname"></label>
          <label class="inline-field"><span class="inline-field__label">Nom de profil</span><input class="inline-field__input" name="name" value="${escapeHtml(user.name)}" placeholder="Nom de profil" autocomplete="name"></label>
        </div>
        ${
          isOAuth
            ? `<div class="stack stack--8 stack--center">
                <p class="h2 lime center">Compte Google</p>
                <p class="body center">${escapeHtml(user.email)}</p>
                <p class="caption muted center">L’adresse mail et la sécurité du compte se gèrent depuis ton compte Google.</p>
              </div>
              <div class="stack stack--16">`
            : `<div class="stack stack--16">
          <p class="h2 lime center">Adresse mail &amp; Mot de passe</p>
          <div class="stack stack--40">
            <div class="stack stack--12">
              <input class="field field--outline" name="email" type="email" placeholder="Adresse mail" value="${escapeHtml(user.email)}" autocomplete="email" aria-label="Adresse mail">
              <input class="field field--outline" name="email2" type="email" placeholder="Adresse mail (confirmation)" autocomplete="email" aria-label="Confirmation de l’adresse mail">
            </div>
            <div class="stack stack--12">
              <input class="field field--outline" name="password" type="password" placeholder="Mot de passe" autocomplete="new-password" aria-label="Mot de passe">
              <input class="field field--outline" name="password2" type="password" placeholder="Mot de passe (confirmation)" autocomplete="new-password" aria-label="Confirmation du mot de passe">
            </div>
            <input class="field field--outline" name="currentPassword" type="password" placeholder="Mot de passe actuel (requis pour e-mail ou mot de passe)" autocomplete="current-password" aria-label="Mot de passe actuel">
          </div>`
        }
          <p class="form-error" data-error hidden></p>
        </div>
        <div class="stack stack--12 stack--center">
          <button type="submit" class="button button--primary button--fixed">Confirmer</button>
          <button type="button" class="button button--ghost button--label" data-action="logout">${icon("logout")} Se déconnecter</button>
        </div>
      </form>`,
      "profile",
    ),
    {
      ...chromeActions({ backFallback: "/profile" }),
      avatar: (target) => {
        avatar = (target.dataset.id as AvatarId) ?? avatar;
        document.querySelectorAll<HTMLElement>("[data-action='avatar']").forEach((option) => {
          const selected = option === target;
          option.classList.toggle("is-selected", selected);
          option.setAttribute("aria-checked", String(selected));
        });
      },
      logout: confirmLogout,
    },
  );

  const form = document.querySelector<HTMLFormElement>("#profile-form");
  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const value = (key: string): string => String(data.get(key) ?? "").trim();
      const error = form.querySelector<HTMLElement>("[data-error]");
      const submit = form.querySelector<HTMLButtonElement>("button[type='submit']");
      const fail = (message: string): void => {
        if (error) {
          error.hidden = false;
          error.textContent = message;
        }
      };
      const email = isOAuth ? "" : value("email");
      const password = String(data.get("password") ?? "");
      const currentPassword = String(data.get("currentPassword") ?? "");
      const emailChanged = email !== "" && email !== user.email;
      if (value("email2") && email !== value("email2")) return fail("Les adresses mail ne correspondent pas.");
      if (password && password !== String(data.get("password2") ?? "")) return fail("Les mots de passe ne correspondent pas.");
      if (password && password.length < 8) return fail("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      if ((emailChanged || password) && user.provider === "password" && !currentPassword)
        return fail("Indique ton mot de passe actuel pour modifier l’e-mail ou le mot de passe.");

      if (submit) submit.disabled = true;
      try {
        await updateProfile({ name: value("name"), handle: value("handle"), email, avatar, currentPassword });
        if (password) await changePassword(currentPassword, password);
        toast("Profil mis à jour");
        navigate("/profile", { replace: true });
      } catch (caught) {
        fail(caught instanceof Error ? caught.message : "Mise à jour impossible.");
        if (submit) submit.disabled = false;
      }
    },
    { signal },
  );
}

export function renderOuts(): void {
  const user = getCurrentUser();
  const outs = getOuts();
  mountScreen(
    AppScreen(
      `${TopBar("Outs")}
      ${Identity(user?.name ?? "Invité", user?.handle ?? "mode invité")}
      <section class="stack stack--16" aria-labelledby="collection-title">
        <h3 id="collection-title" class="h2">Collection de outs · ${outs.length}/${OUTS_CATALOG.length}</h3>
        <div class="wrap">${OUTS_CATALOG.map((out) => Sticker(out, outs.includes(out))).join("")}</div>
      </section>`,
      "profile",
      "screen--loose",
    ),
    chromeActions(),
  );
}
