# Intégration Figma — OUTRS

Source : fichier Figma « Prototype », page **04.Final screens** (+ « 01. Foundations & Tokens » et la Bibliothèque UI en PDF).
Thème unique : **sombre**. Mise en page **100 % flexbox** (aucun `display: block` ni `grid`). Référence mobile 390 px, marges 20 px.

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
| `src/styles/`                | `@layer tokens, base, layout, components, utilities`                 |
| `src/assets/icons/`          | SVG Figma (inlinés et recolorables)                                  |
| `src/assets/shapes/`         | Formes OUTRS utilisées comme masques d'image                         |

## Correspondance écrans Figma → routes

| Figma                     | Route                  | Fichier                    |
| ------------------------- | ---------------------- | -------------------------- |
| Loading                   | (splash au démarrage)  | `screens/onboarding.ts`    |
| CTA                       | `#/welcome`            | `screens/onboarding.ts`    |
| Login choice              | `#/start`              | `screens/onboarding.ts`    |
| Register / Login          | `#/auth/register|login`| `screens/onboarding.ts`    |
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

## Mode invité

Toute action engageante (réserver, poster, commenter, liker, enregistrer, favoris) passe par `requireAuth()`.
Un invité voit un **écran plein** « Rejoins les Outers » avec Se connecter / Créer un compte / Retour.
Après connexion, l'utilisateur revient à l'écran d'origine.

## Checklist de réception

- 390 px sans débordement horizontal, cibles tactiles ≥ 44 px, safe areas iOS réservées.
- Animations limitées à `transform` / `opacity`, `prefers-reduced-motion` respecté.
- Images : `loading="lazy"`, dimensions déclarées, repli Unsplash automatique.
- `npm run build` sans erreur.
