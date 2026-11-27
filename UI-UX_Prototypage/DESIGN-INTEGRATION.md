# Intégration Figma — OUT75

Source : fichier Figma « Prototype », page **04.Final screens** (+ « 01. Foundations & Tokens » et la Bibliothèque UI en PDF).
Thème unique : **sombre**. Mise en page **100 % flexbox** (aucun `display: block` ni `grid`). Référence mobile 390 px, marges 20 px.

## Responsive (un seul balisage, mise en page en CSS)

| Largeur        | Mise en page                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| < 768 px       | Mobile : barre du haut (+ / titre / recherche) et navigation basse en pilule |
| 768 – 1279 px  | Tablette : navigation gauche en icônes, fil central 600 px                   |
| ≥ 1280 px      | Desktop façon X : nav gauche complète (Publier, compte), fil central 600 px, panneau droit (recherche permanente, lives, catégories, prochains billets) |

Les feuilles du bas deviennent des boîtes de dialogue centrées à partir de 768 px.

Écrans d'entrée (intro, connexion, inscription, mot de passe, tutoriel, permission caméra) : gabarit `entry()` (`src/app.ts`).
Mobile : formulaire seul · tablette : carte centrée · desktop (≥ 1024 px) : écran coupé en deux, marque OUT75 à gauche, formulaire à droite.
Le portail de connexion devient une boîte de dialogue ; caméra, publication et live s'élargissent sur desktop.
Styles : `src/styles/responsive.css` (couche `responsive`, prioritaire sur `components`).
Composants : `SideNav`, `SidePanel` et `AppScreen` dans `src/components/chrome.ts`.

## Arborescence

| Dossier / fichier            | Rôle                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `src/main.ts`                | Démarrage, routage, notifications PWA                                |
| `src/app.ts`                 | Montage d'écran, délégation des clics, overlays, toasts, garde invité |
| `src/router.ts`              | Routes hash typées, `navigate`, `goBack`                             |
| `src/api.ts`                 | API OpenData Paris (pagination, recherche, filtres, recherche par id) |
| `src/store.ts` / `auth.ts`   | Stockage local (favoris, billets, posts, outs) et connexion simulée  |
| `src/components/`            | Composants HTML (cartes, barres, feuilles, live, stickers…)          |
| `src/screens/`               | Un fichier par groupe d'écrans Figma                                 |
| `src/utils/`                 | Icônes, images de repli, formatage d'événements, cartes, échappement |
| `src/styles/`                | `@layer tokens, base, layout, components, responsive, utilities`     |
| `src/assets/icons/`          | SVG Figma (inlinés et recolorables)                                  |
| `src/assets/shapes/`         | Formes OUT75 utilisées comme masques d'image                         |

## Correspondance écrans Figma → routes

| Figma                     | Route                  | Fichier                    |
| ------------------------- | ---------------------- | -------------------------- |
| Loading                   | (splash au démarrage)  | `screens/onboarding.ts`    |
| Rejoins les Outers        | `#/start`              | `screens/onboarding.ts`    |
| Register / Login          | `#/auth/register|login|forgot|reset` | `screens/onboarding.ts` |
| Tutoriel                  | `#/tutorial`           | `screens/onboarding.ts`    |
| Home / Search             | `#/home`               | `screens/home.ts`          |
| Detail / Pop up sticker   | `#/event/:id`          | `screens/eventDetail.ts`   |
| Reservations              | `#/tickets`            | `screens/tickets.ts`       |
| Social media / Comment    | `#/community`, `#/share/:id` | `screens/community.ts` |
| Profile / Modifier / Outs | `#/profile`, `#/profile/edit`, `#/outs` | `screens/profile.ts` |
| Events Enregistrés        | `#/favorites`          | `screens/collections.ts`   |
| Categorie                 | `#/categories`         | `screens/collections.ts`   |
| Acces Appareil / Photo    | `#/camera`             | `screens/camera.ts`        |

## Tokens principaux

| Figma                       | Variable CSS            | Valeur    |
| --------------------------- | ----------------------- | --------- |
| Acid Lime                   | `--color-primary`       | `#B8E62E` |
| Electric Violet             | `--color-secondary`     | `#7033FF` |
| Noir profond (fond)         | `--color-bg`            | `#151515` |
| Surface (écrans)            | `--color-surface`       | `#191919` |
| Gris foncé (cartes)         | `--color-card`          | `#353535` |
| Gris clair                  | `--color-text-muted`    | `#BCBCBC` |
| Blanc                       | `--color-text`          | `#FEFEFE` |
| Rose (bouton Guest)         | `--color-accent`        | `#FD71EB` |
| Rayon média / carte / pill  | `--radius-media/card/pill` | 16 / 24 / 999 px |
| Hauteur bouton              | `--size-button`         | 65 px     |

Polices : Anton (Display, capitales) et Plus Jakarta Sans (UI), importées dans `index.html`.

## Authentification (Supabase)

- Client : `src/supabase.ts` (clé **publique** uniquement, flux PKCE). Logique : `src/auth.ts`.
- Variables : `.env.local` (non commité) — modèle dans `.env.example` :
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. À renseigner aussi chez l'hébergeur.
- Schéma : `supabase/schema.sql` (table `profiles`, RLS « chacun son profil », trigger de création à l'inscription).
- Réglages Supabase : Authentication → Email → « Confirm email » désactivé (connexion immédiate) ;
  Authentication → URL Configuration → Site URL + Redirect URLs = adresse de l'app (lien « mot de passe oublié »).
- Écrans : `#/auth/login`, `#/auth/register`, `#/auth/forgot`, `#/auth/reset`.
- Google : OAuth via Supabase (`signInWithOAuth`), retour sur l'app avec `?code=` échangé au démarrage ;
  Google Cloud → client Web, URI de redirection `https://<projet>.supabase.co/auth/v1/callback` ;
  Supabase → Redirect URLs doit contenir l'adresse de l'app (`http://localhost:5173/**` en local).
- Apple : non configuré (message « bientôt disponible », compte Apple Developer payant requis).
- Favoris, billets, stickers et posts restent dans le navigateur (localStorage).

## Mode invité

Toute action engageante (réserver, poster, commenter, liker, enregistrer, favoris) passe par `requireAuth()`.
Un invité voit un **écran plein** « Rejoins les Outers » avec Se connecter / Créer un compte / Retour.
Après connexion, l'utilisateur revient à l'écran d'origine.

## Checklist de réception

- 390 px sans débordement horizontal, cibles tactiles ≥ 44 px, safe areas iOS réservées.
- Animations limitées à `transform` / `opacity`, `prefers-reduced-motion` respecté.
- Images : `loading="lazy"`, dimensions déclarées, repli Unsplash automatique.
- `npm run build` sans erreur.
