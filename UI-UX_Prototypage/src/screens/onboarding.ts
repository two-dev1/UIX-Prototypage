/** Parcours d'entrée : Loading → Choix de connexion → Inscription / Connexion → Tutoriel (passable). */
import { BigMark, JoinPanel, consumeReturnPath, entry, mountScreen, peekReturnPath, rememberReturnPath, root, toast } from "../app.ts";
import {
  AuthError,
  googleLogin,
  PASSWORD_MIN,
  loginUser,
  registerUser,
  requestPasswordReset,
  setNewPassword,
} from "../auth.ts";
import { goBack, navigate, type AuthMode } from "../router.ts";
import { isTutorialDone, setGuestSession, setTutorialDone } from "../store.ts";
import { icon, iconSvg, type IconName } from "../utils/icons.ts";

const Logo = `<span class="logo" role="img" aria-label="OUT75">${icon("logo-text")}</span>`;

/** Écran « Loading » : tracé lime du logo 75, affiché au démarrage. */
export function showSplash(): Promise<void> {
  const splash = document.createElement("div");
  splash.className = "splash";
  splash.setAttribute("aria-hidden", "true");
  splash.innerHTML = `<span class="splash__mark">${icon("logo-75")}</span><span class="splash__logo">${icon("logo-text")}</span>`;
  document.body.append(splash);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return new Promise((resolve) => {
    window.setTimeout(
      () => {
        splash.classList.add("is-leaving");
        window.setTimeout(() => splash.remove(), 320);
        resolve();
      },
      reduced ? 200 : 1300,
    );
  });
}

/** Après connexion / inscription / invité : tutoriel la première fois, sinon retour à l'écran demandé. */
export function finishEntry(): void {
  if (!isTutorialDone()) navigate("/tutorial", { replace: true });
  else navigate(consumeReturnPath(), { replace: true });
}

interface Slide {
  title: string;
  text: string;
  visual: IconName;
  violet?: boolean;
}

const SLIDES: Slide[] = [
  { title: "Bonjour, Paris.", text: "Toutes les sorties culturelles de Paris, réunies dans une seule app.", visual: "logo-75", violet: true },
  { title: "Explore.", text: "Filtre par envie, cherche un lieu, un artiste ou un quartier, et enregistre tes coups de cœur.", visual: "search-green" },
  { title: "Réserve.", text: "Ton billet arrive avec son QR code et débloque un sticker Out pour ta collection.", visual: "sticker" },
  { title: "Partage.", text: "Poste tes photos et stories, commente avec des GIFs et rejoins les lives des Outers.", visual: "story-plus" },
];

/** Mini tutoriel : diapositives balayables, bouton « Passer » toujours visible. */
export function renderTutorial(): void {
  let index = 0;
  const finish = (): void => {
    setTutorialDone();
    navigate(consumeReturnPath(), { replace: true });
  };
  const signal = mountScreen(
    entry(`<main class="onboarding tutorial">
      <div class="onboarding__head">
        ${Logo}
        <button type="button" class="button button--ghost button--label tutorial__skip" data-action="skip">Passer</button>
      </div>
      <div class="tutorial__track" data-track aria-roledescription="carrousel" aria-label="Découvrir OUT75">
        ${SLIDES.map(
          (slide, position) => `<section class="tutorial__slide" aria-roledescription="diapositive" aria-label="${position + 1} sur ${SLIDES.length}">
            ${
              slide.visual === "logo-75"
                ? BigMark("tutorial__visual--wide", true)
                : `<span class="tutorial__visual" aria-hidden="true">${iconSvg(slide.visual)}</span>`
            }
            <div class="stack stack--12">
              <h1 class="display${slide.violet ? " display--violet" : ""}">${slide.title}</h1>
              <p class="body">${slide.text}</p>
            </div>
          </section>`,
        ).join("")}
      </div>
      <div class="stack stack--24 stack--center">
        <div class="tutorial__dots" aria-hidden="true">${SLIDES.map((_, position) => `<span class="tutorial__dot${position === 0 ? " is-active" : ""}"></span>`).join("")}</div>
        <button type="button" class="button button--secondary button--fixed" data-action="next">Suivant</button>
      </div>
    </main>`),
    {
      skip: finish,
      next: () => {
        if (index >= SLIDES.length - 1) return finish();
        go(index + 1);
      },
    },
  );

  const track = root.querySelector<HTMLElement>("[data-track]");
  const update = (next: number): void => {
    index = next;
    root.querySelectorAll(".tutorial__dot").forEach((dot, position) => dot.classList.toggle("is-active", position === index));
    const button = root.querySelector("[data-action='next']");
    if (button) button.textContent = index === SLIDES.length - 1 ? "C’est parti" : "Suivant";
  };
  const go = (next: number): void => {
    track?.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    update(next);
  };
  track?.addEventListener(
    "scroll",
    () => {
      const next = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (next !== index) update(next);
    },
    { passive: true, signal },
  );
}

/** Écran d'entrée (après le loader) : la page « Rejoins les Outers », sans retour. */
export function renderStart(): void {
  mountScreen(entry(`<main class="onboarding onboarding--join">${JoinPanel({ back: false })}</main>`), {
    "gate-login": () => navigate("/auth/login"),
    "gate-register": () => navigate("/auth/register"),
    guest: () => {
      setGuestSession(true);
      finishEntry();
    },
  });
}

interface AuthCopy {
  title: string;
  subtitle: string;
  submit: string;
  pending: string;
}

const COPY: Record<AuthMode, AuthCopy> = {
  register: {
    title: "Inscription",
    subtitle: `Vous avez déjà un compte ? <button type="button" class="link" data-action="switch" data-to="login">Se connecter</button>`,
    submit: "Continuer",
    pending: "Création…",
  },
  login: {
    title: "Connexion",
    subtitle: `Pas encore de compte ? <button type="button" class="link" data-action="switch" data-to="register">S’inscrire</button>`,
    submit: "Se connecter",
    pending: "Connexion…",
  },
  forgot: {
    title: "Mot de passe oublié",
    subtitle: "Indique ton adresse mail : tu recevras un lien pour choisir un nouveau mot de passe.",
    submit: "Envoyer le lien",
    pending: "Envoi…",
  },
  reset: {
    title: "Nouveau mot de passe",
    subtitle: `Choisis un nouveau mot de passe (${PASSWORD_MIN} caractères minimum).`,
    submit: "Enregistrer",
    pending: "Enregistrement…",
  },
};

function fields(mode: AuthMode): string {
  const input = (name: string, label: string, type: string, autocomplete: string, extra = ""): string =>
    `<label class="visually-hidden" for="auth-${name}">${label}</label>
     <input id="auth-${name}" class="field" name="${name}" type="${type}" placeholder="${label}" autocomplete="${autocomplete}" required ${extra}>`;
  switch (mode) {
    case "register":
      return [
        input("name", "Nom d’utilisateur", "text", "nickname", 'maxlength="40"'),
        input("email", "Adresse mail", "email", "email", 'inputmode="email"'),
        input("password", `Mot de passe (${PASSWORD_MIN} caractères min.)`, "password", "new-password", `minlength="${PASSWORD_MIN}"`),
      ].join("");
    case "login":
      return [
        input("email", "Adresse mail", "email", "email", 'inputmode="email"'),
        input("password", "Mot de passe", "password", "current-password"),
      ].join("");
    case "forgot":
      return input("email", "Adresse mail", "email", "email", 'inputmode="email"');
    case "reset":
      return [
        input("password", "Nouveau mot de passe", "password", "new-password", `minlength="${PASSWORD_MIN}"`),
        input("password2", "Confirmation du mot de passe", "password", "new-password", `minlength="${PASSWORD_MIN}"`),
      ].join("");
  }
}

/** Écrans « Register » / « Login » + mot de passe oublié / nouveau mot de passe (Supabase). */
export function renderAuth(mode: AuthMode): void {
  const copy = COPY[mode];
  const withSocial = mode === "login" || mode === "register";
  mountScreen(
    entry(`<main class="onboarding">
      <div class="onboarding__head">
        <button type="button" class="icon-button icon-button--edge onboarding__back" data-action="back" aria-label="Retour">${icon("back")}</button>
        ${Logo}
      </div>
      <form class="onboarding__body" id="auth-form" novalidate>
        <div class="stack stack--12">
          <h1 class="display">${copy.title}</h1>
          <p class="body">${copy.subtitle}</p>
        </div>
        <div class="stack stack--24">
          ${fields(mode)}
          ${mode === "login" ? `<button type="button" class="link link--underline self-start" data-action="switch" data-to="forgot">Mot de passe oublié ?</button>` : ""}
          <p class="form-error" data-error role="alert" hidden></p>
          <p class="form-success" data-success role="status" hidden></p>
        </div>
        ${
          withSocial
            ? `<button type="button" class="social-button social-button--google" data-action="google"><span class="social-button__g" aria-hidden="true">G</span>Continuer avec Google</button>`
            : ""
        }
      </form>
      <button type="submit" form="auth-form" class="button button--secondary button--fixed">${copy.submit}</button>
    </main>`),
    {
      back: () => goBack(mode === "forgot" ? "/auth/login" : "/start"),
      switch: (target) => navigate(`/auth/${target.dataset.to}`, { replace: true }),
      google: async (target) => {
        try {
          rememberReturnPath(peekReturnPath());
          target.setAttribute("aria-busy", "true");
          await googleLogin();
        } catch (error) {
          target.removeAttribute("aria-busy");
          showError(error instanceof Error ? error.message : "Connexion impossible.");
        }
      },
    },
  );

  const form = document.querySelector<HTMLFormElement>("#auth-form");
  const submit = document.querySelector<HTMLButtonElement>("button[form='auth-form']");
  const errorBox = form?.querySelector<HTMLElement>("[data-error]");
  const successBox = form?.querySelector<HTMLElement>("[data-success]");

  function showError(message: string, field?: string): void {
    if (successBox) successBox.hidden = true;
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = message;
    }
    form?.querySelectorAll(".field").forEach((input) => input.removeAttribute("aria-invalid"));
    const target = field ? form?.querySelector<HTMLInputElement>(`[name="${field}"]`) : null;
    target?.setAttribute("aria-invalid", "true");
    target?.focus();
  }

  function showSuccess(message: string): void {
    if (errorBox) errorBox.hidden = true;
    if (successBox) {
      successBox.hidden = false;
      successBox.textContent = message;
    }
  }

  const setPending = (pending: boolean): void => {
    if (!submit) return;
    submit.disabled = pending;
    submit.textContent = pending ? copy.pending : copy.submit;
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const emailValid = /^\S+@\S+\.\S+$/.test(email);

    if (mode === "register" && name.length < 2) return showError("Ton nom d’utilisateur doit faire au moins 2 caractères.", "name");
    if (mode !== "reset" && !emailValid) return showError("Adresse mail invalide.", "email");
    if ((mode === "register" || mode === "reset") && password.length < PASSWORD_MIN)
      return showError(`Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`, "password");
    if (mode === "reset" && password !== String(data.get("password2") ?? ""))
      return showError("Les mots de passe ne correspondent pas.", "password2");
    if (mode === "login" && !password) return showError("Indique ton mot de passe.", "password");

    setPending(true);
    try {
      if (mode === "register") await registerUser(name, email, password);
      else if (mode === "login") await loginUser(email, password);
      else if (mode === "forgot") {
        await requestPasswordReset(email);
        showSuccess("Si un compte existe pour cette adresse, un lien vient d’être envoyé. Pense à vérifier tes spams.");
        setPending(false);
        return;
      } else {
        await setNewPassword(password);
        toast("Mot de passe mis à jour");
      }
      finishEntry();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Une erreur est survenue.", error instanceof AuthError ? error.field : undefined);
      setPending(false);
    }
  });
}
