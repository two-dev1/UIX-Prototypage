# Intégration Figma

## Emplacements à modifier

- `src/styles/tokens.css` : couleurs, typographie fluide, espacements, rayons, ombres, dimensions fixes et thèmes.
- `src/styles/base.css` : reset, typographie globale et comportements de formulaire.
- `src/styles/layout.css` : conteneur, grille et en-tête.
- `src/styles/components.css` : cartes, boutons et états BEM.
- `src/styles/utilities.css` : classes transverses.
- `src/components/` : structure HTML des composants, sans logique métier.
- `src/utils/html.ts` : échappement centralisé.
- `src/assets/icons/` : fichiers SVG importés dynamiquement par `icon(name)`.
- `public/fonts/` : fichiers WOFF2 locaux référencés par `@font-face`.

## Procédure Figma vers code

1. Identifier les composants réutilisables et les états visuels dans Figma.
2. Ajouter les nouvelles couleurs, tailles et espacements dans `tokens.css` avec un nom sémantique.
3. Adapter la structure HTML dans le composant concerné.
4. Ajouter les styles de structure dans `layout.css` et les styles du composant dans `components.css`.
5. Vérifier à 390 px, puis aux breakpoints documentés 600, 900 et 1200 px.
6. Exécuter `npm run build` et contrôler les interactions clavier, les zones tactiles et le mode sombre.

## Correspondance Figma

| Élément Figma              | Variable CSS             |
| -------------------------- | ------------------------ |
| Couleur principale / liens | `--color-primary`        |
| Texte principal            | `--color-ink`            |
| Texte secondaire           | `--color-muted`          |
| Fond d’application         | `--color-paper`          |
| Fond de carte              | `--color-card`           |
| Bordure                    | `--color-line`           |
| Gratuit                    | `--color-free`           |
| Payant                     | `--color-paid`           |
| Erreur                     | `--color-danger`         |
| Texte H1                   | `--font-size-h1`         |
| Texte de carte             | `--font-size-card-title` |
| Espacement standard        | `--space-4`              |
| Rayon de carte             | `--radius-medium`        |
| Ombre de carte             | `--shadow-card`          |
| Cible tactile              | `--touch-target-min`     |
| Hauteur de zone basse      | `--bottom-bar-height`    |

## Checklist de réception

- Aucun style `px` fixe pour les couleurs ou espacements hors des tokens.
- La maquette reste lisible à 320 px sans débordement horizontal.
- Toutes les actions mesurent au moins 44 × 44 px.
- Les textes restent accessibles en mode sombre.
- Les images conservent leur ratio et utilisent `object-fit: cover`.
- Les liens externes restent sécurisés.
- Les états chargement, erreur, vide et hors-ligne sont prévus.
- Les safe areas iOS sont réservées lorsque les contrôles atteignent le bas.
- Les animations sont limitées à `transform` et `opacity`.

## Checklist responsive mobile-first

Tester les cas suivants dans DevTools puis sur appareils réels :

| Largeur | Orientation        | Vérifications                                                     |
| ------- | ------------------ | ----------------------------------------------------------------- |
| 320 px  | Portrait / paysage | Aucun débordement horizontal, liens et boutons à 44 × 44 px       |
| 360 px  | Portrait           | Grille sur une colonne, marge latérale cohérente                  |
| 390 px  | Portrait           | Maquette de référence, ratio 16/9 des médias, zone basse réservée |
| 430 px  | Portrait           | Aucun recouvrement du titre ou du lieu                            |
| 600 px  | Portrait / paysage | Passage à 2 colonnes                                              |
| 768 px  | Portrait / paysage | Deux colonnes sans sidebar inventée                               |
| 1024 px | Paysage            | Trois colonnes à partir de 900 px                                 |
| 1280 px | Paysage            | Colonnes de 280 px minimum                                        |

Contrôles transverses :

- Zoom navigateur à 200 % : aucun contenu inutilisable ou masqué.
- Modes clair et sombre : vérifier les contrastes des textes et badges.
- Paysage iPhone/Android : vérifier les quatre safe areas.
- Champs futurs : police minimale de 16 px pour éviter le zoom iOS.
- Zones tactiles, navigation clavier et `prefers-reduced-motion`.
