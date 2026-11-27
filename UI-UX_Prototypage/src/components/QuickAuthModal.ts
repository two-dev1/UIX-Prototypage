import { Modal } from "./Modal.ts";

/** Modale demandant une authentification rapide pour une action engageante. */
export function QuickAuthModal(): string {
  return Modal(
    "Débloquer cette action",
    `
    <p>Connecte-toi ou crée ton compte en 1 clic pour continuer.</p>
    <button type="button" class="button button--primary" data-quick-auth="login">Se connecter</button>
    <button type="button" class="button" data-quick-auth="register">Créer un compte</button>
  `,
    "quick-auth-modal",
  );
}
