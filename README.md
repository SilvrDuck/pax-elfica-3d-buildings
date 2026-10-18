# Auberge de l'Épée en 3D (aide de jeu non officielle)

Maquette 3D de l'auberge de l'Épée, à montrer aux joueurs sur l'écran de la table : on la fait
tourner, on enlève les étages un à un comme une maison de poupée, et chaque pièce est meublée.
La géométrie suit les plans officiels (`Officiel/Plans_batiments/`) au quart de case près ;
le style est volontairement bas-poly, l'éclairage celui d'une taverne au crépuscule.

Huit niveaux : silo -2, silo -1, rez-de-chaussée avec la cour et les alentours, 1er, 2e, 3e, 4e
(sommet de la tour) et les toits. Les 39 pièces numérotées de la légende du livre de base
(pp. 40–42) y sont toutes, une fois chacune.

## Dépendances non incluses

Le dépôt est public ; il ne contient rien d'édité par Les XII Singes.

- **Planches officielles** (`Auberge de l_Epée 1-RDC.jpg`, `2-1er étage.jpg`, `3-étages et toits.jpg`,
  vendues avec *Pax Elfica*) : attendues dans `../../Officiel/Plans_batiments/` par rapport à ce
  dossier (variable d'environnement `PLANS_DIR` pour un autre emplacement). Elles ne servent qu'à
  `tools/calibrate.mjs`, qui en découpe les calques dans `public/plans/` (ignoré par git). Sans
  elles, la maquette fonctionne entièrement ; seule la touche `C` n'affiche rien.
- **Packs 3D CC0** (KayKit, Kenney) : `tools/fetch-assets.sh` les télécharge dans `vendor/` (ignoré).
  Les pièces utilisées sont déjà copiées dans `public/assets/` avec `LICENSES.md`, donc ce
  téléchargement n'est nécessaire que pour ajouter de nouveaux meubles.

## Lancer

```sh
npm install
npm run dev        # puis ouvrir l'adresse affichée (http://localhost:5173/)
```

Pour une version figée à copier sur le portable de la table : `npm run build`, puis servir le dossier
`dist/` (`npm run preview` le fait en local). Il faut Node 20 ou plus et un navigateur avec WebGL.

## Commandes

| Geste | Effet |
|---|---|
| Glisser, molette, clic droit | Orbiter, zoomer, déplacer |
| Liste à droite, ou `↑` / `↓` | Choisir le niveau affiché ; tout ce qui est au-dessus disparaît |
| « Vue d'ensemble » | Revenir à la caméra de départ |
| `N` | Noms des pièces (niveau affiché seulement) |
| `C` | Calque du plan officiel projeté sur le sol du niveau affiché, pour vérifier l'alignement |

Paramètres d'URL pour ouvrir directement dans un état : `?level=e1&labels=1&calque=1&view=top`
(`view=top` donne une vue orthographique d'en haut, utile pour les captures de contrôle).

## Données

Chaque niveau est un fichier `src/data/levels/<niveau>.json` : murs, ouvertures, sols, escaliers,
pièces, meubles, lumières, toits, en mètres (origine au coin haut-gauche de la planche RdC, x vers
l'est, z vers le sud, 1 case = 1,5 m). Ces fichiers sont **générés** par les scripts de
`tools/levels/*.mjs`, écrits en coordonnées de cases des plans ; pour corriger la maquette, on
modifie le script puis on le relance :

```sh
node tools/levels/e1.mjs          # régénère src/data/levels/e1.json
node tools/grid-view.mjs e1 8 2 10 8 --walls   # vue du plan quadrillée avec les murs du modèle
```

`tools/calibrate.mjs` mesure la grille des planches officielles (179 px par case), recale les
sous-plans de la planche des étages sur celle du RdC et découpe les calques dans `public/plans/`.
`tools/trace-walls.mjs` extrait une première passe de murs de l'encre des planches ; elle a servi de
brouillon, les niveaux actuels sont écrits à la main.

Les modèles 3D viennent de packs CC0 (KayKit, Kenney), téléchargés par `tools/fetch-assets.sh`
dans `vendor/` ; `tools/pick-assets.mjs` ne copie dans `public/assets/` que les pièces listées dans
`src/data/props.json` et écrit `public/assets/LICENSES.md`. Rien du pack visuel officiel n'est
embarqué ; les calques sont des découpes des plans réservées à la vérification.

## Vérifier

```sh
npm test               # géométrie, schéma des niveaux, calibration
npm run test:legend    # chaque pièce de la légende existe dans exactement un niveau
npm run shots          # captures de chaque niveau dans verification/ (vue de dessus, avec calque, perspective)
```

Les captures passent par Chromium (`/usr/bin/chromium`, variable `CHROMIUM` pour un autre chemin).
