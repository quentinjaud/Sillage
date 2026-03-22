# Phase 3a — Journal : dossiers & navigations

## Perimetre

Squelette organisationnel du journal de bord : dossiers, aventures, navigations. Pas de replay anime, pas de photos, pas de timeline. Une trace par navigation max (le multi-traces arrive en Phase 5).

## Hierarchie

```
Dossier (ex: "Saison 2026")
 ├── Aventure (ex: "Tour de Corse")        ← optionnelle
 │    └── Navigation (ex: "Etape 1")
 └── Navigation (orpheline, sans aventure)
```

- Hierarchie stricte a 3 niveaux : Dossier → Aventure → Navigation
- Une navigation est toujours dans un dossier
- Une aventure est toujours dans un dossier
- Une navigation peut etre directement dans un dossier (sans aventure)
- Une trace est liee a une seule navigation max (relation exclusive)

## Modele de donnees

### Nouveaux modeles Prisma

```prisma
enum TypeNavigation {
  SOLO
  REGATE
}

model Dossier {
  id          String   @id @default(cuid())
  nom         String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  aventures   Aventure[]
  navigations Navigation[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}

model Aventure {
  id          String   @id @default(cuid())
  nom         String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dossierId   String
  dossier     Dossier  @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  navigations Navigation[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([dossierId])
  @@index([userId])
}

model Navigation {
  id          String         @id @default(cuid())
  nom         String
  date        DateTime
  type        TypeNavigation @default(SOLO)
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  dossierId   String
  dossier     Dossier        @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  aventureId  String?
  aventure    Aventure?      @relation(fields: [aventureId], references: [id], onDelete: Cascade)
  traceId     String?        @unique
  trace       Trace?         @relation(fields: [traceId], references: [id], onDelete: SetNull)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([dossierId])
  @@index([aventureId])
  @@index([userId])
}
```

### Modifications existantes

- **User** : ajout relations `dossiers Dossier[]`, `aventures Aventure[]`, `navigations Navigation[]`
- **Trace** : ajout relation inverse `navigation Navigation?` (pas de nouveau champ — le FK est sur Navigation)
- **Trace** : ajout champ `polylineSimplifiee Json?` — tableau `[lon, lat][]` simplifie (50-100 points RDP), calcule a l'import pour les mini-cartes d'apercu

### Cascade delete

- Supprimer un dossier → supprime ses aventures et navigations (cascade Prisma)
- Supprimer une aventure → supprime ses navigations (cascade Prisma)
- Supprimer une navigation → detache la trace (`onDelete: SetNull` sur traceId)
- Les traces et trackpoints ne sont jamais supprimes par cascade
- Supprimer une trace (rare, admin) → `SetNull` sur `Navigation.traceId`

### Verification d'appartenance

Chaque modele (Dossier, Aventure, Navigation) porte son propre `userId`. Les endpoints API verifient directement `where: { id, userId }` sans join.

## Routes et pages

### Nouvelle page

- **`/journal`** — Page principale du journal (`export const dynamic = "force-dynamic"`). Server component charge les dossiers avec compteurs. Client component gere l'expand inline et le panneau d'apercu.

### Reorganisation header

Avant :
```
Navimeter    Traces | Bateaux | [Admin]     nom  Deconnexion
```

Apres :
```
Navimeter    Journal | [Admin]              [nom ▾]
                                              ├── Mes traces
                                              ├── Mes bateaux
                                              └── Deconnexion
```

- "Journal" et "Admin" restent des liens directs dans le header
- "Mes traces", "Mes bateaux" passent dans un dropdown Mantine `Menu` sous le nom utilisateur
- Les routes `/traces` et `/bateaux` ne changent pas, seule la navigation change

## API

### Dossiers

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/journal/dossiers` | Liste dossiers du user avec compteurs |
| POST | `/api/journal/dossiers` | Creer `{ nom, description? }` |
| PATCH | `/api/journal/dossiers/[id]` | Modifier nom/description |
| DELETE | `/api/journal/dossiers/[id]` | Supprimer (cascade) |
| GET | `/api/journal/dossiers/[id]/contenu` | Aventures + navs orphelines du dossier |

### Aventures

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/journal/dossiers/[dossierId]/aventures` | Creer `{ nom, description? }` |
| PATCH | `/api/journal/aventures/[id]` | Modifier |
| DELETE | `/api/journal/aventures/[id]` | Supprimer (cascade) |

### Navigations

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/journal/navigations` | Creer `{ nom, date, type?, dossierId, aventureId?, traceId? }` |
| PATCH | `/api/journal/navigations/[id]` | Modifier |
| DELETE | `/api/journal/navigations/[id]` | Supprimer (detache trace) |

### Securite

- Tous les endpoints verifient la session et le `userId` directement sur le modele cible
- Verification d'appartenance sans join : `where: { id, userId }`
- Les reponses serialisent les dates en ISO string

## Composants

### Nouveaux

```
src/components/Journal/
  PageJournal.tsx          — Client component, etat (dossiers ouverts, filtres, element survole)
  CarteDossier.tsx         — Carte avec border-left jaune, compteurs, expand/collapse
  ContenuDossier.tsx       — Contenu deplie : aventures + navs orphelines
  CarteAventure.tsx        — Sous-carte avec border-left bleu, depliable
  CarteNavigation.tsx      — Ligne navigation (nom, date, badges)
  BarreActionsJournal.tsx  — Bouton nouveau dossier + filtres
  ModaleElement.tsx        — Modale partagee creer/editer dossier, aventure, navigation
  PanneauApercu.tsx        — Panneau lateral fixe : mini-carte + stats au survol
  ApercuTrace.tsx          — Mini-carte N&B avec trace coloree (tuiles OSM + SVG)
```

### Modifie

```
MenuUtilisateur.tsx  — Dropdown Mantine Menu (Mes traces, Mes bateaux, Deconnexion)
```

### Types (dans types.ts)

```typescript
ResumeDossier {
  id, nom, description, nbAventures, nbNavigations, createdAt
}

ResumeAventure {
  id, nom, description, navigations: ResumeNavigation[], createdAt
}

ResumeNavigation {
  id, nom, date, type, dossierId, aventureId,
  trace?: {
    id, name, bateau?,
    distanceNm, durationSeconds, avgSpeedKn, maxSpeedKn,
    polylineSimplifiee: [number, number][]  // [lon, lat][]
  }
}

ContenuDossier {
  aventures: ResumeAventure[]
  navigationsOrphelines: ResumeNavigation[]
}
```

## Mini-carte d'apercu (ApercuTrace)

### Principe

Petit composant (~200x140px) qui affiche la trace sur un fond de carte noir et blanc, sans instancier MapLibre.

### Implementation

1. **Fond de carte** : tuiles raster OSM standard, affichees en `<img>` avec `filter: grayscale(1) contrast(0.7)` en CSS
2. **Calcul des tuiles** : a partir du bounding box de la polyline simplifiee, determiner le zoom optimal et les 1-4 tuiles necessaires pour couvrir la zone
3. **Projection** : convertir les coordonnees `[lon, lat]` en pixels via projection Mercator (Web Mercator EPSG:3857 → pixel dans la tuile)
4. **Trace** : `<svg>` superpose sur les tuiles avec `<polyline>` coloree (couleur accent `--accent` ou gradient vitesse)
5. **Pas de JS cartographique** : tout est calcul pur + HTML/CSS/SVG

### Donnees

- La polyline simplifiee est stockee sur `Trace.polylineSimplifiee` (champ `Json?`)
- Calculee a l'import via Ramer-Douglas-Peucker (50-100 points max)
- Les traces existantes sans polyline : migration ou calcul lazy au premier affichage

### Pour les aventures

Superposition de toutes les traces des navigations de l'aventure. Bounding box = union des bounding boxes. Chaque trace en couleur differente ou meme couleur accent.

## Panneau d'apercu (PanneauApercu)

### Principe

Panneau lateral fixe a droite de la page `/journal`. Son contenu change au survol d'une aventure ou d'une navigation. Invisible/vide au survol d'un dossier ou sans survol.

### Contenu

**Au survol d'une navigation :**
- Mini-carte N&B avec la trace
- Date de depart
- Distance (NM)
- Temps sur l'eau (duree)
- Bateau
- Type (solo/regate)

**Au survol d'une aventure :**
- Mini-carte N&B avec toutes les traces superposees
- Date de la premiere navigation
- Distance totale (somme)
- Temps sur l'eau total (somme)
- Nombre de navigations

### Comportement

- Position fixe a droite (`position: sticky` ou layout grid avec colonne fixe)
- Transition douce du contenu au changement de survol (`opacity` 0.15s)
- Sur les elements sans trace liee : affiche les infos texte sans mini-carte
- Les stats aventure sont calculees cote client a partir des navigations chargees

## Design visuel

### Hierarchie visuelle par couleur

- **Dossier** : carte blanche, `border-left: 4px solid var(--accent-yellow)` jaune
- **Aventure** : sous-carte, `border-left: 4px solid var(--accent)` bleu
- **Navigation** : ligne neutre, bordure standard `var(--border)`

### Badges navigation

- Type SOLO : badge gris discret `--border` / `--text-secondary`
- Type REGATE : badge jaune `--accent-yellow-light` / `--accent-yellow-dark`
- Bateau : badge bleu `--accent-light` / `--accent`
- Trace liee : icone route ; "Aucune trace" en gris leger

### Layout page /journal

```
┌─────────────────────────────────────────────────────────┐
│  [Barre d'actions : + Nouveau dossier | Filtres]        │
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│  Liste des dossiers (cartes)      │  Panneau apercu     │
│  └── Dossier deplie               │  (fixe, ~280px)     │
│       ├── Aventure                 │                     │
│       │    └── Navigation          │  [mini-carte N&B]   │
│       └── Navigation orpheline     │  Distance: 12.3 NM  │
│                                   │  Duree: 3h42        │
│                                   │  Depart: 15 mars    │
│                                   │  Bateau: Figaro 3   │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
```

### Interactions

- Expand/collapse dossier : transition CSS `max-height` + `opacity` (0.15s ease)
- Contenu en retrait : `padding-left: 24px`
- Aventures depliables dans le dossier ouvert
- CRUD via modales Mantine
- Cache client : le contenu d'un dossier est fetche une fois, pas re-fetche a chaque toggle
- Survol aventure/navigation : panneau d'apercu se met a jour

### Etat vide

- Aucun dossier : icone carnet a 40% opacite + "Creez votre premier dossier pour organiser vos navigations"

## Flux d'interaction

1. Server component `/journal` charge les dossiers avec compteurs via Prisma (`force-dynamic`)
2. `PageJournal` (client) recoit la liste en props, gere l'etat (dossiers ouverts, element survole)
3. Clic sur dossier → fetch `GET /api/journal/dossiers/[id]/contenu` → expand inline
4. Contenu mis en cache cote client (Map ou objet en state)
5. CRUD via modales → fetch API → re-fetch liste ou mise a jour optimiste locale
6. Survol aventure/navigation → met a jour `PanneauApercu` avec les donnees de l'element
7. Filtres (bateau, type, date) s'appliquent uniquement aux dossiers deja deplies. Les dossiers replies ne sont pas filtres (leur contenu n'est pas charge). Un indicateur visuel precise que les filtres ne s'appliquent qu'au contenu visible.

## Hors perimetre (phases suivantes)

- Replay anime, timeline, curseur synchronise (Phase 3b)
- Entrees journal texte + photos (Phase 3c)
- Multi-traces par navigation / table pivot NavigationTrace (Phase 5)
- Lien de partage public (Phase 7)
- Page "Mes preferences" (phase separee)
- Drag & drop pour reorganiser dossiers/aventures/navigations
