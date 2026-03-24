# Refonte Accueil — Carte OGF + Panneaux Flottants

> Spec validee en brainstorming le 2026-03-24

## Contexte

L'accueil actuel (page journal) est une liste hierarchique a 3 niveaux (Dossier > Aventure > Navigation) avec expand/collapse. C'est peu visuel, demande beaucoup de clics, et n'est pas unifie avec le reste de l'app (la carte est absente).

Cette refonte transforme l'accueil en une **experience cartographique immersive** : une carte fictive (OpenGeoFiction) en fond, des panneaux flottants par-dessus pour naviguer dans ses donnees, et des traces projetees directement sur la carte.

## Principes

1. **La carte au centre** — fond carto present partout, meme decoratif
2. **Panneaux flottants** — meme langage visuel que les panneaux stats en vue navigation (creme semi-transparent, blur, border-radius)
3. **Tout au clic** — pas de hover, meme en desktop. Meilleur pour tablette, moins de rendu
4. **Deux modes** — accueil immersif (carte + marqueurs) vs settings utilitaire (tableau classique)

## Carte de fond OGF

### Source
- Tuiles raster OpenGeoFiction : `https://tile.opengeofiction.net/ogf-carto/{z}/{x}/{y}.png`
- Zone initiale : environ `-28.90 / 48.43`, zoom 8 — zone cotiere avec archipel
- Semi-interactif : pan + zoom libre (pas juste decoratif)
- Bounding box souple : l'utilisateur peut explorer librement, mais un bouton "recentrer" ramene a la zone initiale
- **Layout spatial** : la cote est a gauche du viewport — les marqueurs-dossiers et panneaux s'ouvrent cote gauche, les aperçus de traces se projettent en mer cote droit

### Rendu
- Tuiles desaturees et teintees creme pour coller a la charte (`filter: grayscale(...) sepia(...)` ou traitement CSS)
- Aucune interactivite type marqueur OSM — les seuls marqueurs sont les dossiers de l'utilisateur

### Fallback
- Si les tuiles OGF sont indisponibles (serveur tiers) : fond uni creme avec motif subtle (vagues CSS ou texture) pour que l'app reste utilisable
- Cache navigateur des tuiles deja chargees (comportement natif MapLibre)

### Implementation
- MapLibre GL JS via `react-map-gl`, `dynamic()` + `ssr: false` (comme la vue navigation)
- Source raster OGF au lieu des tuiles OSM standard

## Marqueurs-dossiers

### Concept
Chaque dossier de l'utilisateur est represente par un **marqueur** sur la carte OGF, place sur un "port" fictif de la cote.

### Placement
- **Initial** : placement automatique sur des points cotes predefinies (coordonnees en dur dans la zone OGF choisie — ports, baies, pointes)
- **Repositionnable** : drag-and-drop avec snap sur les points predefinies
- **Persistance** : position stockee sur le dossier (nouveaux champs `markerLat`, `markerLon` sur le modele Groupe/Dossier)

### Visuel
- Marqueur custom (pas un pin generique) — nom du dossier + compteur d'items (ex: "Glenans 2025 · 7")
- Style coherent avec les panneaux (fond creme, typo Atkinson Hyperlegible)

### Interaction
- Clic = ouvre le panneau de contenu du dossier
- Drag = repositionne (mode edition uniquement, ou toujours ?)

## Panneau de contenu (dossier)

### Structure
Panneau flottant qui s'ouvre au clic sur un marqueur-dossier. Fermeture par bouton X ou clic sur la carte en dehors du panneau.

```
┌─────────────────────────────┐
│ Accueil > Glenans 2025    ✕ │  ← breadcrumb (clic pour remonter) + fermer
├─────────────────────────────┤
│ 🔴 Stage juin        5 navs │  ← aventure (rouge brique)
│ 🔴 Stage sept        3 navs │  ← aventure
│ 🔵 Balade Glenan     12 NM  │  ← nav solo (bleu)
│ 🟡 Regate Concarneau 8 NM   │  ← regate (jaune)
│ ⚫ Trace brute J3     —      │  ← trace en edition (gris)
├─────────────────────────────┤
│     [+ Nav] [+ Sous-dossier]│
└─────────────────────────────┘
```

### Items en ligne compacte
Chaque item = une ligne avec :
- **Accent couleur** a gauche (bordure ou pastille) selon le type
- **Nom**
- **Info secondaire** en pills : date, distance, nombre de navs (pour aventure)

### Codes couleur
| Type | Couleur | Usage |
|------|---------|-------|
| Navigation solo | Bleu `#43728B` | Nav classique, 1 bateau 1 trace |
| Aventure | Rouge brique (a definir, ~`#C45B3E`) | Multi-navs assemblees |
| Regate | Jaune `#F6BC00` | Multi-bateaux |
| Trace en edition | Gris `#9E9E9E` | Trace importee pas encore finalisee |

### Bouton "+ Ajouter"
- Deux actions : `+ Nav` (cree une navigation, modale pour choisir le type et lier une trace) et `+ Sous-dossier` (cree un dossier imbrique)
- La modale de creation reprend `ModaleElement` adaptee au nouveau modele

### Navigation dans les niveaux
- Clic sur un **sous-dossier** = le panneau transite vers son contenu, breadcrumb mis a jour
- Clic sur une **nav/aventure/regate** = affichage de l'apercu sur la carte (voir section suivante)
- Clic sur **"Accueil"** dans le breadcrumb = ferme le panneau, retour a la vue marqueurs
- **Profondeur max : 2 niveaux** (Dossier > Sous-dossier). Pas d'imbrication infinie pour garder l'UI simple

## Apercu de trace (au clic sur un item)

### Projection sur la carte OGF
Quand on clique un item qui a une trace :
- La **polyline simplifiee** s'affiche "en mer" sur la carte OGF
- Un clic sur un autre item remplace l'apercu precedent (un seul apercu a la fois)

#### Algorithme de projection
La trace reelle n'a pas de coordonnees dans le monde OGF. On la projette comme un **dessin mis a l'echelle** :
1. Prendre la `polylineSimplifiee` (deja calculee, 50-100 points)
2. Calculer la bounding box de la trace reelle
3. Normaliser les points en coordonnees relatives (0-1, 0-1)
4. Ancrer le point de depart sur une position OGF en zone d'eau libre (cote droit du viewport, en mer)
5. Appliquer un facteur d'echelle pour que la trace fasse ~200-400px a l'ecran au zoom courant
6. Le facteur d'echelle s'adapte au zoom (la trace garde une taille ecran constante, pas une taille "geographique")
7. Conserver le ratio d'aspect de la trace originale

C'est un **overlay decoratif**, pas un positionnement geographiquement exact. La precision vient quand on "Ouvre" la navigation sur les vraies tuiles OSM.

### Mini-stats en tooltips
Autour de la trace affichee, des **pills/tooltips** flottants positionnees aux extremites de la trace :
- Date de debut de premiere trace
- Lieu de depart (si disponible)
- Distance totale (NM)
- Duree totale
- Style : memes pills que PanneauPointActif (fond sombre semi-transparent, texte clair)

### Bouton "Ouvrir"
- Bouton bien visible associe a l'apercu (pres de la trace ou dans le panneau)
- Clic = navigation Next.js vers `/navigation/{id}` (changement de route complet, pas de transition animee pour V1)

### Pour les aventures
- Traces de toutes les sous-navs affichees, assemblees (concatenation des polylines simplifiees)
- Stats agregees
- La navigation de type `AVENTURE` stocke sa propre `polylineSimplifiee` pre-calculee (concatenation des sous-navs) pour eviter N requetes au survol

## Panneau Settings

### Concept
Pas une page separee — un **panneau flottant** invocable par un bouton (engrenage) depuis n'importe ou (accueil ou vue navigation).

### Contenu
- **Import de traces** (upload GPX)
- **Gestion bateaux** (CRUD)
- **Mode "editer mes dossiers"** : vue tableau classique
  - Arborescence sans carte, sans imaginaire
  - Icones d'edition rapide (renommer, deplacer, supprimer)
  - Modification des meta en ligne
  - UI simple et conventionnelle (tableau/liste)
- Plus tard : preferences utilisateur, export, etc.

## Modele de donnees — simplification

### Avant (3 niveaux)
```
Dossier → Aventure → Navigation
```

### Apres (2 concepts)
- **Dossier** — conteneur pur, pas de vue carto. Peut contenir des navs et des sous-dossiers (max 2 niveaux). A une position sur la carte OGF (`markerLat`, `markerLon`).
- **Navigation** — objet carto avec trace, stats, timeline. Trois types :
  - `SOLO` (bleu) — 1 bateau, 1 trace
  - `AVENTURE` (rouge brique) — multi-navs assemblees, vue carto compilee
  - `REGATE` (jaune) — multi-bateaux, traces comparees

L'aventure **n'est plus un niveau hierarchique** — c'est un type de navigation qui contient des sous-navigations.

> On garde le nom "Dossier" (pas de rename en "Groupe") pour minimiser les changements d'API et de code. Le concept est le meme, on ajoute juste l'imbrication et la position.

### Schema Prisma apres migration

```prisma
model Dossier {
  id            String    @id @default(cuid())
  nom           String
  description   String?
  markerLat     Float?          // position sur carte OGF
  markerLon     Float?          // position sur carte OGF
  parentId      String?         // sous-dossier (max 1 niveau d'imbrication)
  parent        Dossier?  @relation("DossierParent", fields: [parentId], references: [id])
  sousDossiers  Dossier[] @relation("DossierParent")
  navigations   Navigation[]
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum TypeNavigation {
  SOLO
  AVENTURE
  REGATE
}

model Navigation {
  id               String         @id @default(cuid())
  nom              String
  date             DateTime
  type             TypeNavigation @default(SOLO)
  dossierId        String
  dossier          Dossier        @relation(fields: [dossierId], references: [id])
  parentNavId      String?        // sous-nav d'une aventure
  parentNav        Navigation?    @relation("NavParent", fields: [parentNavId], references: [id])
  sousNavigations  Navigation[]   @relation("NavParent")
  traceId          String?        @unique
  trace            Trace?         @relation(fields: [traceId], references: [id])
  userId           String
  user             User           @relation(fields: [userId], references: [id])
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}
```

### Migration depuis le schema actuel

1. **Ajouter les nouveaux champs** sur Dossier : `markerLat`, `markerLon`, `parentId`
2. **Ajouter `AVENTURE`** a l'enum `TypeNavigation`
3. **Ajouter `parentNavId`** sur Navigation
4. **Migrer les Aventures existantes** :
   - Pour chaque `Aventure`, creer une `Navigation` de type `AVENTURE` dans le meme dossier
   - Reporter `nom`, `description`, `date` (= date de la premiere sous-nav)
   - Pour chaque nav liee a cette aventure via `aventureId`, setter `parentNavId` vers la nouvelle nav AVENTURE
   - Calculer et stocker la `polylineSimplifiee` concatenee sur la trace de la nav AVENTURE
5. **Supprimer le modele `Aventure`** et la relation `aventureId` sur Navigation
6. **Supprimer `User.aventures`** relation

### Navs sans dossier
Toute navigation doit appartenir a un dossier. Pour les navs "en vrac", un **dossier par defaut** "Non classes" est cree automatiquement par utilisateur. Son marqueur est place sur un point fixe de la carte OGF. Il ne peut pas etre supprime.

### Traces et aventures
- Une nav `SOLO` ou `REGATE` a sa propre `Trace` (relation 1:1 existante)
- Une nav `AVENTURE` n'a **pas de trace propre**. Sa polyline simplifiee est calculee a la volee (concatenation des `polylineSimplifiee` de ses sous-navs) et cachee en champ JSON sur la Navigation pour l'apercu accueil
- Les sous-navs d'une aventure gardent chacune leur trace independante

## Outils contextuels par type de vue

Les outils disponibles dans l'UI varient selon le type de navigation ouverte :

| Outil | Solo | Aventure | Regate |
|-------|------|----------|--------|
| Carte + trace | oui | oui (assemblees) | oui (superposees) |
| Timeline | oui | oui (multi-jours) | oui (departs alignes) |
| Graphique vitesse | oui | oui | oui (comparatif) |
| Journal/recit | oui | oui (compile) | oui (collectif) |
| Enrichissement meteo | oui | oui | oui |
| Classement | non | non | oui |
| Delta temps | non | non | oui |

## Ce qui disparait

- Hierarchie 3 niveaux expand/collapse sur la page journal
- `CarteAventure` comme composant separe (l'aventure est un type de nav)
- Panneau apercu au hover (remplace par projection sur carte au clic)
- Page settings separee (remplacee par panneau flottant)
- Mini-cartes par item dans le panneau (remplacees par la carte de fond)

## Ce qui reste

- `ApercuTrace` — le composant actuel rend des SVG sur mini-carte statique. Pour l'accueil, la projection se fera en source GeoJSON sur MapLibre (implementation differente, meme donnees `polylineSimplifiee`). Le composant actuel reste utile dans le panneau settings/tableau.
- Les panneaux stats (`PanneauStats`, `PanneauPointActif`) — style de reference pour tous les panneaux
- `ModaleElement` — adaptee pour creer/editer dans le nouveau modele
- Les vues navigation existantes — inchangees, juste lancees depuis le nouveau point d'entree

## Etat vide / onboarding

Quand un utilisateur arrive sans aucun dossier :
- La carte OGF est visible, pas de marqueurs
- Un panneau central invite a creer son premier dossier : "Placez votre premier port d'attache" (ou equivalent)
- Au clic, le dossier se cree et le marqueur apparait sur un point cote par defaut
- Le dossier "Non classes" est cree automatiquement en arriere-plan

## API — changements

Les routes actuelles (`/api/journal/dossiers/...`, `/api/journal/aventures/...`, `/api/journal/navigations/...`) evoluent :

| Route actuelle | Nouvelle route | Notes |
|----------------|----------------|-------|
| `/api/journal/dossiers` | Inchangee | + champs position |
| `/api/journal/dossiers/[id]/contenu` | Inchangee | Retourne sous-dossiers + navs (plus aventures separees) |
| `/api/journal/aventures/[id]` | Supprimee | L'aventure est une nav de type AVENTURE |
| `/api/journal/dossiers/[id]/aventures` | Supprimee | On cree une nav de type AVENTURE via `/navigations` |
| `/api/journal/navigations` | Inchangee | + type AVENTURE, + parentNavId |
| `/api/journal/navigations/[id]` | Inchangee | + sous-navigations pour type AVENTURE |
| — | `/api/journal/dossiers/[id]/position` | PATCH : mise a jour markerLat/markerLon (drag) |

## Questions ouvertes

1. **Couleur rouge brique exacte** pour aventure — a valider visuellement (`#C45B3E` ? `#B5452A` ?)
2. **Points de snap predefinies** — combien ? 10-15 positions sur la cote OGF suffisent pour commencer ?
3. **Drag des marqueurs** — toujours actif ou seulement via un bouton "reorganiser" ?
4. **Performance marqueurs** — si un utilisateur a 30+ dossiers, clustering de marqueurs ou on limite le nombre de dossiers racine ?
5. **Panneau settings : dimensions et position** — panneau lateral droit ? Overlay central ? Largeur fixe ou responsive ?
