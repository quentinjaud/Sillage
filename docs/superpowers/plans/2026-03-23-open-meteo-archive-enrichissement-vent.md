# Enrichissement vent Open-Meteo Archive — Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre a l'utilisateur d'enrichir une trace GPS avec les donnees de vent historiques d'Open-Meteo Archive, affichees dans le panneau stats, le graphique et une rose des vents HUD sur la carte.

**Architecture:** Table separee `CelluleMeteo` (resolution 25km/1h) liee a `Trace`. Route API `POST /api/traces/[id]/meteo` pour fetcher Open-Meteo a la demande. Donnees chargees cote serveur au rendu, passees aux composants client. Rose des vents HUD en bas a droite de la carte, selecteur d'orientation dans le bouton boussole.

**Tech Stack:** Prisma 7, Next.js 16, React 19, Recharts, MapLibre GL JS, Open-Meteo Archive API

**Spec:** `docs/superpowers/specs/2026-03-23-open-meteo-archive-enrichissement-vent.md`

---

## Structure de fichiers

### Fichiers a creer

| Fichier | Responsabilite |
|---------|---------------|
| `src/lib/services/open-meteo-archive.ts` | Fetch Open-Meteo API, stockage BDD, suppression |
| `src/lib/geo/stats-vent.ts` | Calculs stats vent (moyenne circulaire, ponderee) |
| `src/app/api/traces/[id]/meteo/route.ts` | Route POST (fetch) + DELETE (suppression) |
| `src/components/Map/RoseDesVents.tsx` | HUD rose des vents en overlay carte |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | Ajout modele `CelluleMeteo` + relation sur `Trace` |
| `src/lib/types.ts` | Ajout `CelluleMeteoClient`, `StatsVent`, extension `DonneeGraphee` |
| `src/components/Stats/PanneauStats.tsx` | Bouton enrichir + affichage stats vent |
| `src/components/Stats/TraceChart.tsx` | Donnee graphee "vent" avec courbe monotone bleue |
| `src/components/Map/TraceMap.tsx` | Boussole → selecteur, rotation vent, rendu RoseDesVents |
| `src/components/TraceVueClient.tsx` | Props meteo + callback rose des vents |
| `src/components/NavigationVueClient.tsx` | Idem TraceVueClient |
| `src/app/trace/[id]/page.tsx` | Include cellulesMeteo dans query, calcul statsVent |
| `src/app/navigation/[id]/page.tsx` | Idem |

---

## Task 1 : Schema Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Ajouter le modele CelluleMeteo au schema Prisma**

Dans `prisma/schema.prisma`, ajouter apres le modele `TrackPoint` :

```prisma
model CelluleMeteo {
  id               String   @id @default(cuid())
  traceId          String
  trace            Trace    @relation(fields: [traceId], references: [id], onDelete: Cascade)
  latitude         Float
  longitude        Float
  dateDebut        DateTime
  dateFin          DateTime
  ventVitesseKn    Float
  ventRafalesKn    Float
  ventDirectionDeg Float
  source           String   @default("open-meteo-archive")
  resolution       String   @default("25km/1h")

  @@unique([traceId, latitude, longitude, dateDebut])
  @@index([traceId])
}
```

Et ajouter dans le modele `Trace` :
```prisma
cellulesMeteo CelluleMeteo[]
```

- [ ] **Step 2: Generer et appliquer la migration**

Run: `npx prisma migrate dev --name ajout_cellule_meteo`
Expected: migration appliquee, `prisma generate` execute

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: ajout modele CelluleMeteo pour donnees vent Open-Meteo"
```

---

## Task 2 : Types TypeScript

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Ajouter les types meteo dans types.ts**

Ajouter apres la definition de `PointCarte` (ligne ~118) :

```typescript
export interface CelluleMeteoClient {
  latitude: number;
  longitude: number;
  dateDebut: string;
  dateFin: string;
  ventVitesseKn: number;
  ventRafalesKn: number;
  ventDirectionDeg: number;
}

export interface StatsVent {
  ventMoyenKn: number;
  rafalesMaxKn: number;
  directionMoyenneDeg: number;
  variationDirectionDeg: number;
  source: string;
  resolution: string;
}
```

- [ ] **Step 2: Etendre DonneeGraphee**

Modifier la ligne `export type DonneeGraphee = "vitesse" | "cap";` en :

```typescript
export type DonneeGraphee = "vitesse" | "cap" | "vent";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: ajout types CelluleMeteoClient, StatsVent, DonneeGraphee vent"
```

---

## Task 3 : Utilitaires stats vent

**Files:**
- Create: `src/lib/geo/stats-vent.ts`

- [ ] **Step 1: Creer le module de calcul stats vent**

Creer `src/lib/geo/stats-vent.ts` :

```typescript
import type { CelluleMeteoClient } from "../types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Moyenne circulaire des angles (en degres).
 * Utilise atan2(mean(sin), mean(cos)) pour gerer le wrap-around 0/360.
 */
export function moyenneCirculaire(anglesDeg: number[]): number {
  if (anglesDeg.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of anglesDeg) {
    sinSum += Math.sin(a * DEG_TO_RAD);
    cosSum += Math.cos(a * DEG_TO_RAD);
  }
  const moyenne = Math.atan2(sinSum / anglesDeg.length, cosSum / anglesDeg.length) * RAD_TO_DEG;
  return moyenne < 0 ? moyenne + 360 : moyenne;
}

/**
 * Ecart-type circulaire (en degres).
 * Formule : sqrt(-2 * ln(R)) en radians, ou R = longueur du vecteur moyen.
 */
export function ecartTypeCirculaire(anglesDeg: number[]): number {
  if (anglesDeg.length <= 1) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of anglesDeg) {
    sinSum += Math.sin(a * DEG_TO_RAD);
    cosSum += Math.cos(a * DEG_TO_RAD);
  }
  const n = anglesDeg.length;
  const R = Math.sqrt((sinSum / n) ** 2 + (cosSum / n) ** 2);
  if (R >= 1) return 0;
  return Math.sqrt(-2 * Math.log(R)) * RAD_TO_DEG;
}

/**
 * Calcule les stats vent agregees a partir des cellules meteo.
 * Moyenne vitesse ponderee par duree, rafales max, direction circulaire.
 */
export function calculerStatsVent(cellules: CelluleMeteoClient[]): {
  ventMoyenKn: number;
  rafalesMaxKn: number;
  directionMoyenneDeg: number;
  variationDirectionDeg: number;
} {
  if (cellules.length === 0) {
    return { ventMoyenKn: 0, rafalesMaxKn: 0, directionMoyenneDeg: 0, variationDirectionDeg: 0 };
  }

  // Moyenne ponderee par duree
  let sommePonderee = 0;
  let sommeDurees = 0;
  let rafalesMax = 0;
  const directions: number[] = [];

  for (const c of cellules) {
    const duree = new Date(c.dateFin).getTime() - new Date(c.dateDebut).getTime();
    sommePonderee += c.ventVitesseKn * duree;
    sommeDurees += duree;
    if (c.ventRafalesKn > rafalesMax) rafalesMax = c.ventRafalesKn;
    directions.push(c.ventDirectionDeg);
  }

  return {
    ventMoyenKn: sommeDurees > 0 ? sommePonderee / sommeDurees : 0,
    rafalesMaxKn: rafalesMax,
    directionMoyenneDeg: moyenneCirculaire(directions),
    variationDirectionDeg: ecartTypeCirculaire(directions),
  };
}

/**
 * Trouve la cellule meteo active pour un point donne (timestamp + position).
 * 1. Filtre par temps (dateDebut <= timestamp < dateFin)
 * 2. Parmi celles-ci, prend la plus proche spatialement
 */
export function trouverCelluleActive(
  cellules: CelluleMeteoClient[],
  timestamp: string | null,
  lat: number,
  lon: number
): CelluleMeteoClient | null {
  if (!timestamp || cellules.length === 0) return null;

  const t = new Date(timestamp).getTime();

  // Filtre temporel
  const candidates = cellules.filter((c) => {
    const debut = new Date(c.dateDebut).getTime();
    const fin = new Date(c.dateFin).getTime();
    return t >= debut && t < fin;
  });

  if (candidates.length === 0) {
    // Fallback : cellule la plus proche temporellement
    let meilleure = cellules[0];
    let minDist = Infinity;
    for (const c of cellules) {
      const centre = (new Date(c.dateDebut).getTime() + new Date(c.dateFin).getTime()) / 2;
      const dist = Math.abs(t - centre);
      if (dist < minDist) { minDist = dist; meilleure = c; }
    }
    return meilleure;
  }

  if (candidates.length === 1) return candidates[0];

  // Filtre spatial : plus proche du point GPS
  let meilleure = candidates[0];
  let minDist = Infinity;
  for (const c of candidates) {
    const dist = (c.latitude - lat) ** 2 + (c.longitude - lon) ** 2;
    if (dist < minDist) { minDist = dist; meilleure = c; }
  }
  return meilleure;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/geo/stats-vent.ts
git commit -m "feat: utilitaires calcul stats vent (moyenne circulaire, cellule active)"
```

---

## Task 4 : Service Open-Meteo + route API

**Files:**
- Create: `src/lib/services/open-meteo-archive.ts`
- Create: `src/app/api/traces/[id]/meteo/route.ts`

- [ ] **Step 1: Creer le service Open-Meteo Archive**

Creer `src/lib/services/open-meteo-archive.ts` :

```typescript
import { prisma } from "../db";
import { calculerStatsVent } from "../geo/stats-vent";
import type { StatsVent, CelluleMeteoClient } from "../types";

const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const GRILLE_DEG = 0.25; // resolution spatiale Open-Meteo (~25km)
const DELAI_ARCHIVE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Arrondit une coordonnee au centre de cellule Open-Meteo le plus proche.
 */
function arrondir(coord: number): number {
  return Math.round(coord / GRILLE_DEG) * GRILLE_DEG;
}

/**
 * Determine les centres de cellules couvrant une bounding box.
 */
function determinerCentresCellules(
  latMin: number, latMax: number, lonMin: number, lonMax: number
): { lat: number; lon: number }[] {
  const centres: { lat: number; lon: number }[] = [];
  const latDebut = arrondir(latMin);
  const latFin = arrondir(latMax);
  const lonDebut = arrondir(lonMin);
  const lonFin = arrondir(lonMax);

  for (let lat = latDebut; lat <= latFin + GRILLE_DEG / 2; lat += GRILLE_DEG) {
    for (let lon = lonDebut; lon <= lonFin + GRILLE_DEG / 2; lon += GRILLE_DEG) {
      centres.push({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
    }
  }
  return centres;
}

/**
 * Fetch les donnees vent depuis Open-Meteo Archive pour une trace.
 * Stocke les CelluleMeteo en BDD et retourne les stats calculees.
 */
export async function chargerVentOpenMeteo(traceId: string): Promise<{
  statsVent: StatsVent;
  cellules: CelluleMeteoClient[];
}> {
  // Verifier que les donnees n'existent pas deja
  const existant = await prisma.celluleMeteo.count({ where: { traceId } });
  if (existant > 0) {
    throw new Error("Donnees meteo deja presentes pour cette trace");
  }

  // Recuperer les points non-exclus avec timestamps
  const points = await prisma.trackPoint.findMany({
    where: { traceId, isExcluded: false, timestamp: { not: null } },
    select: { lat: true, lon: true, timestamp: true },
    orderBy: { pointIndex: "asc" },
  });

  if (points.length === 0) {
    throw new Error("Aucun point avec timestamp dans cette trace");
  }

  // Verifier le delai d'archive (7 jours)
  const dernierTimestamp = points[points.length - 1].timestamp!;
  if (Date.now() - dernierTimestamp.getTime() < DELAI_ARCHIVE_MS) {
    throw new Error("Trace trop recente — donnees archives disponibles apres 7 jours");
  }

  // Bounding box
  let latMin = Infinity, latMax = -Infinity, lonMin = Infinity, lonMax = -Infinity;
  for (const p of points) {
    if (p.lat < latMin) latMin = p.lat;
    if (p.lat > latMax) latMax = p.lat;
    if (p.lon < lonMin) lonMin = p.lon;
    if (p.lon > lonMax) lonMax = p.lon;
  }

  // Plage temporelle
  const premierTimestamp = points[0].timestamp!;
  const dateDebut = premierTimestamp.toISOString().split("T")[0];
  const dateFin = dernierTimestamp.toISOString().split("T")[0];

  // Centres de cellules
  const centres = determinerCentresCellules(latMin, latMax, lonMin, lonMax);

  // Fetch par batch de 10 locations
  const toutesLignes: {
    latitude: number;
    longitude: number;
    dateDebut: Date;
    dateFin: Date;
    ventVitesseKn: number;
    ventRafalesKn: number;
    ventDirectionDeg: number;
  }[] = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < centres.length; i += BATCH_SIZE) {
    const batch = centres.slice(i, i + BATCH_SIZE);
    const lats = batch.map((c) => c.lat).join(",");
    const lons = batch.map((c) => c.lon).join(",");

    const url = `${OPEN_METEO_ARCHIVE_URL}?latitude=${lats}&longitude=${lons}&start_date=${dateDebut}&end_date=${dateFin}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timezone=UTC`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit Open-Meteo atteint — reessayez plus tard");
      }
      throw new Error(`Erreur Open-Meteo : ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Open-Meteo renvoie un tableau si multi-locations, un objet si single
    const resultats = Array.isArray(data) ? data : [data];

    for (let j = 0; j < resultats.length; j++) {
      const resultat = resultats[j];
      const centre = batch[j];
      const heures = resultat.hourly?.time ?? [];
      const vitesses = resultat.hourly?.wind_speed_10m ?? [];
      const directions = resultat.hourly?.wind_direction_10m ?? [];
      const rafales = resultat.hourly?.wind_gusts_10m ?? [];

      for (let k = 0; k < heures.length; k++) {
        if (vitesses[k] == null || directions[k] == null) continue;
        const heure = new Date(heures[k]);
        toutesLignes.push({
          latitude: centre.lat,
          longitude: centre.lon,
          dateDebut: heure,
          dateFin: new Date(heure.getTime() + 3600_000),
          ventVitesseKn: vitesses[k],
          ventRafalesKn: rafales[k] ?? vitesses[k],
          ventDirectionDeg: directions[k],
        });
      }
    }
  }

  // Stocker en BDD
  await prisma.celluleMeteo.createMany({
    data: toutesLignes.map((l) => ({
      traceId,
      ...l,
    })),
    skipDuplicates: true,
  });

  // Serialiser pour le client
  const cellulesClient: CelluleMeteoClient[] = toutesLignes.map((l) => ({
    latitude: l.latitude,
    longitude: l.longitude,
    dateDebut: l.dateDebut.toISOString(),
    dateFin: l.dateFin.toISOString(),
    ventVitesseKn: l.ventVitesseKn,
    ventRafalesKn: l.ventRafalesKn,
    ventDirectionDeg: l.ventDirectionDeg,
  }));

  const statsVent: StatsVent = {
    ...calculerStatsVent(cellulesClient),
    source: "open-meteo-archive",
    resolution: "25km/1h",
  };

  return { statsVent, cellules: cellulesClient };
}

/**
 * Supprime toutes les cellules meteo d'une trace (permet re-fetch).
 */
export async function supprimerVentOpenMeteo(traceId: string): Promise<void> {
  await prisma.celluleMeteo.deleteMany({ where: { traceId } });
}
```

- [ ] **Step 2: Creer la route API meteo**

Creer `src/app/api/traces/[id]/meteo/route.ts` :

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { chargerVentOpenMeteo, supprimerVentOpenMeteo } from "@/lib/services/open-meteo-archive";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id } = await params;
  const trace = await prisma.trace.findUnique({ where: { id } });
  if (!trace) return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });

  const userId = await obtenirIdUtilisateurEffectif(session);
  if (trace.userId !== userId && !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  try {
    const resultat = await chargerVentOpenMeteo(id);
    return NextResponse.json(resultat);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("deja presentes") ? 409
      : message.includes("trop recente") ? 422
      : message.includes("Aucun point") ? 422
      : message.includes("Rate limit") ? 429
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id } = await params;
  const trace = await prisma.trace.findUnique({ where: { id } });
  if (!trace) return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });

  const userId = await obtenirIdUtilisateurEffectif(session);
  if (trace.userId !== userId && !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await supprimerVentOpenMeteo(id);
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/open-meteo-archive.ts src/app/api/traces/[id]/meteo/route.ts
git commit -m "feat: service Open-Meteo Archive + route API POST/DELETE meteo"
```

---

## Task 5 : PanneauStats — bouton enrichir + stats vent

**Files:**
- Modify: `src/components/Stats/PanneauStats.tsx`

- [ ] **Step 1: Etendre les props de PanneauStats**

Ajouter a l'interface `PropsPanneauStats` :

```typescript
traceId?: string;
statsVent?: StatsVent | null;
traceTimestamps?: boolean; // la trace a-t-elle des timestamps ?
traceTropRecente?: boolean; // trace < 7 jours ?
onMeteoChargee?: (statsVent: StatsVent) => void;
```

- [ ] **Step 2: Ajouter le bouton enrichir et les stats vent**

Logique de rendu apres les 4 stats existantes :

- Si `statsVent` : afficher les 4 lignes vent (Vent moy, Rafales, Direction en cardinal, Var. dir.) + label "Open-Meteo archive · 25km/1h" + lien "Supprimer meteo"
- Si pas de `statsVent` et `traceTimestamps === false` : bouton grise "Timestamps requis"
- Si pas de `statsVent` et `traceTropRecente === true` : bouton grise "Disponible apres 7 jours"
- Sinon : bouton "Enrichir meteo" cliquable

Le bouton appelle `POST /api/traces/${traceId}/meteo` et affiche un loader pendant le fetch.

Fonction utilitaire pour convertir les degres en cardinal (N, NE, E, SE, S, SW, W, NW) :

```typescript
function directionCardinale(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Stats/PanneauStats.tsx
git commit -m "feat: PanneauStats — bouton enrichir meteo + stats vent"
```

---

## Task 6 : Server components — chargement cellulesMeteo

**Files:**
- Modify: `src/app/trace/[id]/page.tsx`
- Modify: `src/app/navigation/[id]/page.tsx`

- [ ] **Step 1: Modifier la page trace pour inclure les cellulesMeteo**

Dans `src/app/trace/[id]/page.tsx`, modifier la requete Prisma pour inclure `cellulesMeteo: true` dans l'include. Serialiser les cellules en `CelluleMeteoClient[]`. Calculer `StatsVent` si des cellules existent. Verifier si la trace a des timestamps et si elle est trop recente (< 7 jours). Passer tout ca a `TraceVueClient` via de nouvelles props.

- [ ] **Step 2: Modifier la page navigation de la meme facon**

Dans `src/app/navigation/[id]/page.tsx`, meme pattern : inclure `cellulesMeteo` via la relation `trace`, serialiser, calculer stats, passer a `NavigationVueClient`.

- [ ] **Step 3: Commit**

```bash
git add src/app/trace/[id]/page.tsx src/app/navigation/[id]/page.tsx
git commit -m "feat: chargement cellulesMeteo dans les server components trace/nav"
```

---

## Task 7 : Client views — props meteo

**Files:**
- Modify: `src/components/TraceVueClient.tsx`
- Modify: `src/components/NavigationVueClient.tsx`
- Modify: `src/lib/hooks/useEtatVue.ts`

- [ ] **Step 1: Etendre useEtatVue pour supporter "vent"**

Le hook gere deja `donneeGraphee` avec `useState<DonneeGraphee>`. L'extension du type `DonneeGraphee` suffit. Verifier que `capDisponible` ne bloque pas le mode "vent" (le switch vent passe par la rose des vents, pas par les pills).

- [ ] **Step 2: Etendre TraceVueClient**

Ajouter les props meteo et les passer aux enfants :
- `PanneauStats` : `traceId`, `statsVent`, `traceTimestamps`, `traceTropRecente`, `onMeteoChargee`
- `TraceMap` (via wrapper) : `cellulesMeteo`, `statsVent`, `donneeGraphee`, `onClickRoseDesVents` (les props de TraceMap sont deja etendues en Task 10 Step 1 — s'assurer que Task 10 Step 1 est fait avant cette etape ou etendre `PropsCarteTrace` ici)
- `TraceChart` : `cellulesMeteo`

Le callback `onClickRoseDesVents` fait un toggle : si `donneeGraphee === "vent"` → revient a `"vitesse"`, sinon → `"vent"`.

Le callback `onMeteoChargee` met a jour le state local avec les nouvelles stats et cellules (apres un fetch reussi).

- [ ] **Step 3: Etendre NavigationVueClient de la meme facon**

Meme ajouts de props et wiring.

- [ ] **Step 4: Commit**

```bash
git add src/components/TraceVueClient.tsx src/components/NavigationVueClient.tsx src/lib/hooks/useEtatVue.ts
git commit -m "feat: wiring props meteo dans TraceVueClient et NavigationVueClient"
```

---

## Task 8 : TraceChart — donnee graphee "vent"

**Files:**
- Modify: `src/components/Stats/TraceChart.tsx`

- [ ] **Step 1: Ajouter "vent" dans CONFIG_DONNEES**

```typescript
```

Note : ne PAS ajouter "vent" dans `CONFIG_DONNEES` car `cle` est type `keyof PointCarte` et `ventVitesseKn` n'est pas un champ de `PointCarte`. A la place, gerer le mode "vent" comme un cas special.

- [ ] **Step 2: Gerer le mode vent comme cas special**

Quand `donneeGraphee === "vent"` :
- Projeter les `CelluleMeteo` sur l'axe temps : un point au centre de chaque intervalle horaire
- Construire un dataset separe `donneesVent` avec `{ timestamp, ventVitesseKn }`
- Utiliser `type="monotone"` (Catmull-Rom) pour la courbe
- Couleur fixe `#43728B` (bleu Sillage) au lieu du gradient vitesse
- Titre "Vent (kn)", formater `v.toFixed(1) kn`, pas de domaine fixe
- Pas de sous-echantillonnage (peu de points, resolution horaire)

Le composant recoit un nouveau prop `cellulesMeteo?: CelluleMeteoClient[]`. Quand le mode est "vent", il court-circuite `CONFIG_DONNEES` et utilise ses propres constantes + donnees.

- [ ] **Step 3: Commit**

```bash
git add src/components/Stats/TraceChart.tsx
git commit -m "feat: TraceChart — courbe vent monotone bleue depuis CelluleMeteo"
```

---

## Task 9 : Rose des vents HUD

**Files:**
- Create: `src/components/Map/RoseDesVents.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Creer le composant RoseDesVents**

Creer `src/components/Map/RoseDesVents.tsx` :

Props :
```typescript
interface PropsRoseDesVents {
  celluleActive: CelluleMeteoClient | null;
  statsVent: StatsVent;
  donneeGraphee: DonneeGraphee;
  onClick: () => void;
}
```

Rendu :
- SVG compact de rose des vents (~60x60px) avec lettres cardinales (N, E, S, W)
- Fleche orientee selon `celluleActive?.ventDirectionDeg ?? statsVent.directionMoyenneDeg`
- Vitesse du vent en kn sous la rose
- Style : fond semi-transparent `rgba(0,0,0,0.6)`, coins arrondis, texte blanc
- Highlight visuel (bordure jaune) quand `donneeGraphee === "vent"` (mode actif)
- `cursor: pointer`, `onClick` pour toggle le mode vent

- [ ] **Step 2: Ajouter les styles CSS**

Dans `globals.css`, ajouter les styles pour `.rose-des-vents` : position absolute bottom-right, z-index au-dessus de la carte, meme style que `.echelle-carte`.

- [ ] **Step 3: Commit**

```bash
git add src/components/Map/RoseDesVents.tsx src/app/globals.css
git commit -m "feat: composant RoseDesVents HUD en overlay carte"
```

---

## Task 10 : TraceMap — integration rose + selecteur boussole

**Files:**
- Modify: `src/components/Map/TraceMap.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Etendre les props de TraceMap**

Ajouter :
```typescript
cellulesMeteo?: CelluleMeteoClient[];
statsVent?: StatsVent | null;
donneeGraphee?: DonneeGraphee;
onClickRoseDesVents?: () => void;
```

- [ ] **Step 2: Calculer la cellule active**

Utiliser `trouverCelluleActive()` de `stats-vent.ts` avec le timestamp et la position du point actif pour determiner la cellule meteo courante.

- [ ] **Step 3: Rendre la RoseDesVents**

Si `statsVent` existe, rendre `<RoseDesVents>` en bas a droite de la carte avec la cellule active calculee.

- [ ] **Step 4: Transformer le bouton boussole en selecteur**

Remplacer le clic simple (reset north) par un popover avec :
- "Nord" (toujours disponible, icone boussole)
- "Vent archive" (disponible si `statsVent`, icone vent)

Quand "Vent archive" est selectionne et que la cellule active change, appeler `map.rotateTo(celluleActive.ventDirectionDeg, { duration: 500 })`.

Note : `ventDirectionDeg` est l'origine du vent (convention meteo). `map.rotateTo(angle)` place cet angle en haut du viewport — donc le vent souffle du haut vers le bas, ce qui est la convention voile standard.

Quand "Nord" est reselectionne, appeler `map.resetNorthPitch()`.

- [ ] **Step 5: Ajouter les styles CSS du popover**

Styles pour le popover du selecteur boussole.

- [ ] **Step 6: Commit**

```bash
git add src/components/Map/TraceMap.tsx src/app/globals.css
git commit -m "feat: TraceMap — rose des vents HUD + selecteur orientation boussole"
```

---

## Task 11 : Test end-to-end manuel + polish

**Files:**
- Aucun nouveau fichier

- [ ] **Step 1: Verifier le build**

Run: `npm run build`
Expected: pas d'erreurs TypeScript, build reussi

- [ ] **Step 2: Test manuel**

Checklist :
- [ ] Ouvrir une trace avec timestamps > 7 jours → bouton "Enrichir meteo" visible
- [ ] Cliquer → loader → stats vent apparaissent dans PanneauStats
- [ ] Rose des vents HUD visible en bas a droite
- [ ] Clic sur rose → graphique passe en mode vent (courbe bleue)
- [ ] Re-clic sur rose → revient a vitesse
- [ ] Clic sur pill vitesse/cap → quitte le mode vent aussi
- [ ] Bouton boussole → popover avec Nord + Vent archive
- [ ] Selection "Vent archive" → carte tourne
- [ ] Deplacer le curseur → rose des vents s'adapte a la cellule active
- [ ] Ouvrir la meme trace en navigation → memes donnees meteo
- [ ] "Supprimer meteo" → stats disparaissent, bouton revient

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: enrichissement vent Open-Meteo Archive — polish et corrections"
```

---

## Resume des commits

| # | Message | Fichiers |
|---|---------|----------|
| 1 | `feat: ajout modele CelluleMeteo` | prisma/ |
| 2 | `feat: types CelluleMeteoClient, StatsVent, DonneeGraphee vent` | types.ts |
| 3 | `feat: utilitaires stats vent` | stats-vent.ts |
| 4 | `feat: service Open-Meteo + route API` | services/, api/ |
| 5 | `feat: PanneauStats enrichir meteo` | PanneauStats.tsx |
| 6 | `feat: chargement cellulesMeteo server` | trace page, nav page |
| 7 | `feat: wiring props meteo client` | VueClients, hook |
| 8 | `feat: TraceChart courbe vent` | TraceChart.tsx |
| 9 | `feat: RoseDesVents HUD` | RoseDesVents.tsx, CSS |
| 10 | `feat: TraceMap rose + selecteur` | TraceMap.tsx, CSS |
| 11 | `feat: polish et corrections` | divers |
