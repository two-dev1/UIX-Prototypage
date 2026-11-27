/** Parcours d'entrée : Loading → CTA → Choix de connexion → Inscription / Connexion. */
import { consumeReturnPath, mountScreen } from "../app.ts";
import { loginUser, registerUser } from "../auth.ts";
import { goBack, navigate } from "../router.ts";
import { setOnboarded } from "../store.ts";
import { icon } from "../utils/icons.ts";
import { fallbackImage } from "../utils/images.ts";

const Logo = `<span class="logo" role="img" aria-label="OUTRS">${icon("logo-text")}</span>`;

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

/** Écran « CTA ». */
export function renderWelcome(): void {
  mountScreen(
    `<main class="onboarding">
      <div class="onboarding__head">${Logo}</div>
      <span class="logo-75 logo-75--bleed" aria-hidden="true">${icon("logo-75")}</span>
      <div class="onboarding__body">
        <div class="stack stack--8">
          <h1 class="display display--violet">Bonjour, Paris.</h1>
          <p class="body">Que faire à Paris ?</p>
        </div>
      </div>
      <button type="button" class="button button--secondary button--fixed" data-action="start">Commencer</button>
    </main>`,
    { start: () => navigate("/start") },
  );
}

/** Écran « Login choice » : connexion, inscription ou invité. */
export function renderStart(): void {
  mountScreen(
    `<main class="onboarding">
      <div class="onboarding__head">${Logo}</div>
      <div class="photo-frame">
        <img src="${fallbackImage("Paris", 900)}" alt="Paris, la tour Eiffel" width="400" height="661" fetchpriority="high" decoding="async">
      </div>
      <div class="button-row">
        <button type="button" class="button button--primary button--label button--grow" data-action="login">Login</button>
        <button type="button" class="button button--secondary button--label button--grow" data-action="register">Register</button>
        <button type="button" class="button button--accent button--label button--grow" data-action="guest">Guest</button>
      </div>
    </main>`,
    {
      login: () => navigate("/auth/login"),
      register: () => navigate("/auth/register"),
      guest: () => {
        setOnboarded();
        navigate("/home", { replace: true });
      },
    },
  );
}

/** Écrans « Register » / « Login » (connexion locale simulée). */
export function renderAuth(mode: "login" | "register"): void {
  const isRegister = mode === "register";
  mountScreen(
    `<main class="onboarding">
      <div class="onboarding__head">
        <button type="button" class="icon-button icon-button--edge onboarding__back" data-action="back" aria-label="Retour">${icon("back")}</button>
        ${Logo}
      </div>
      <form class="onboarding__body" id="auth-form" novalidate>
        <div class="stack stack--8">
          <h1 class="display">${isRegister ? "Inscription" : "Connexion"}</h1>
          <p class="body">${
            isRegister
              ? `Vous avez déjà un compte ? <button type="button" class="link" data-action="switch" data-to="login">Se connecter</button>`
              : `Pas encore de compte ? <button type="button" class="link" data-action="switch" data-to="register">S’inscrire</button>`
          }</p>
        </div>
        <div class="stack stack--26">
          <label class="visually-hidden" for="auth-name">Nom d’utilisateur</label>
          <input id="auth-name" class="field${isRegister ? "" : " field--sm"}" name="name" placeholder="${isRegister ? "Nom d’utilisateur" : "Nom d’utilisateur ou e-mail"}" autocomplete="${isRegister ? "nickname" : "username"}" required>
          ${
            isRegister
              ? `<label class="visually-hidden" for="auth-email">Adresse mail</label>
                 <input id="auth-email" class="field" name="email" type="email" placeholder="Adresse mail" autocomplete="email" inputmode="email" required>`
              : ""
          }
          <label class="visually-hidden" for="auth-password">Mot de passe</label>
          <input id="auth-password" class="field${isRegister ? "" : " field--sm"}" name="password" type="password" placeholder="Mot de passe" minlength="4" autocomplete="${isRegister ? "new-password" : "current-password"}" required>
          <p class="form-error" data-error hidden></p>
        </div>
        <div class="button-row button-row--20">
          <button type="button" class="social-button social-button--apple" data-action="social" data-provider="apple" aria-label="Continuer avec Apple">${icon("apple")}</button>
          <button type="button" class="social-button social-button--google" data-action="social" data-provider="google" aria-label="Continuer avec Google">G</button>
        </div>
      </form>
      <button type="submit" form="auth-form" class="button button--secondary button--fixed">${isRegister ? "Continuer" : "Se connecter"}</button>
    </main>`,
    {
      back: () => goBack("/start"),
      switch: (target) => navigate(`/auth/${target.dataset.to}`, { replace: true }),
      social: (target) => {
        loginUser(`camille.${target.dataset.provider ?? "social"}@outrs.fr`);
        navigate(consumeReturnPath(), { replace: true });
      },
    },
  );

  const form = document.querySelector<HTMLFormElement>("#auth-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const error = form.querySelector<HTMLElement>("[data-error]");
    const fail = (message: string): void => {
      if (error) {
        error.hidden = false;
        error.textContent = message;
      }
    };
    if (!name) return fail("Indique ton nom d’utilisateur.");
    if (isRegister && !/^\S+@\S+\.\S+$/.test(email)) return fail("Adresse mail invalide.");
    if (password.length < 4) return fail("Le mot de passe doit contenir au moins 4 caractères.");
    if (isRegister) registerUser(name, email);
    else loginUser(name);
    navigate(consumeReturnPath(), { replace: true });
  });
}
