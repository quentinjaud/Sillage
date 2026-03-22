# Phase 3b — Vue navigation immersive — Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creer la vue navigation immersive (`/navigation/[id]`) et enrichir les deux vues (trace + navigation) avec graphique multi-donnees, timeline, marqueur directionnel et panneau stats enrichi.

**Architecture:** Fork de `TraceVueClient` en `NavigationVueClient`. Composants partages entre les deux vues : `TraceChart` (remplace `SpeedChart`), `Timeline`, `PanneauStats`, marqueur directionnel sur `TraceMap`. La vue navigation ajoute metadonnees editables et breadcrumb.

**Tech Stack:** Next.js 16, React 19, TypeScript, Recharts, MapLibre GL JS (react-map-gl), CSS vanilla

**Spec:** `docs/superpowers/specs/2026-03-22-phase3b-vue-navigation-immersive.md`

---

## Structure de fichiers

```
Creer :
  src/components/Stats/TraceChart.tsx        — graphique multi-donnees (remplace SpeedChart)
  src/components/Stats/PanneauStats.tsx       — stats globales + point actif + switch donnee
  src/components/Stats/Timeline.tsx           — slider temporel
  src/components/NavigationVueClient.tsx      — orchestrateur vue navigation
  src/app/navigation/[id]/page.tsx            — server component
  src/app/navigation/[id]/loading.tsx         — etat chargement
  src/app/navigation/[id]/not-found.tsx       — 404

Modifier :
  src/lib/types.ts                            — ajouter PointCarte, DonneeGraphee, types navigation
  src/components/Map/TraceMap.tsx              — marqueur directionnel (remplace dot)
  src/components/TraceVueClient.tsx            — utiliser nouveaux composants partages
  src/components/Journal/CarteNavigation.tsx   — lien vers /navigation/[id]
  src/app/trace/[id]/page.tsx                 — PanneauStats au lieu de StatsPanel
  src/app/globals.css                         — styles timeline, marqueur, point actif

Supprimer :
  src/components/Stats/SpeedChart.tsx          — remplace par TraceChart
  src/components/Stats/StatsPanel.tsx          — remplace par PanneauStats
```

---

## Task 1 : Types partages dans types.ts

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Ajouter PointCarte et DonneeGraphee dans types.ts**

A la fin de la section existante, avant `// === Journal de bord ===`, ajouter :

```typescript
// === Vue trace / navigation ===

/** Point pour la carte et les graphiques (serialise depuis le server component) */
export interface PointCarte {
  lat: number;
  lon: number;
  timestamp: string | null;
  speedKn: number | null;
  headingDeg: number | null;
  pointIndex: number;
}

/** Donnee affichee dans le graphique — extensible pour NMEA futur */
export type DonneeGraphee = "vitesse" | "cap";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: types partages PointCarte et DonneeGraphee"
```

---

## Task 2 : TraceChart (remplace SpeedChart)

**Files:**
- Create: `src/components/Stats/TraceChart.tsx`

- [ ] **Step 1: Creer TraceChart.tsx**

Partir du code de `SpeedChart.tsx` et generaliser. Le composant doit :
- Accepter `donnee: DonneeGraphee` en prop
- Pour `'vitesse'` : meme gradient bleu→rouge qu'actuellement, axe Y en kn, titre "Vitesse"
- Pour `'cap'` : couleur unique `COULEURS.accent` (#43728B), axe Y 0-360°, titre "Cap GPS"
- Points avec valeur null → gaps (filtrer du dataset)
- Renommer `pointSurvole` → `pointActifIndex` dans les props
- Garder le downsampling identique (max 500 points)
- Tooltip adapte : pour vitesse `"{val} kn"`, pour cap `"{val}°"`

```typescript
"use client";

import { useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { COULEURS } from "@/lib/theme";
import {
  calculerStatsVitesse,
  vitesseVersCouleur,
} from "@/lib/geo/couleur-vitesse";
import type { PointCarte, DonneeGraphee } from "@/lib/types";

interface PropsTraceChart {
  points: PointCarte[];
  donnee: DonneeGraphee;
  pointActifIndex: number | null;
  onHoverPoint: (pointIndex: number | null) => void;
}

const CONFIG_DONNEES: Record<
  DonneeGraphee,
  {
    titre: string;
    cle: keyof PointCarte;
    unite: string;
    formater: (v: number) => string;
    domaine?: [number, number];
  }
> = {
  vitesse: {
    titre: "Vitesse",
    cle: "speedKn",
    unite: "kn",
    formater: (v) => `${v.toFixed(1)} kn`,
  },
  cap: {
    titre: "Cap GPS",
    cle: "headingDeg",
    unite: "°",
    formater: (v) => `${Math.round(v)}°`,
    domaine: [0, 360],
  },
};

function sousechantillonner<T>(donnees: T[], pointsMax: number): T[] {
  if (donnees.length <= pointsMax) return donnees;
  const pas = donnees.length / pointsMax;
  const resultat: T[] = [];
  for (let i = 0; i < pointsMax; i++) {
    resultat.push(donnees[Math.round(i * pas)]);
  }
  const dernierIndex = donnees.length - 1;
  if (Math.round((pointsMax - 1) * pas) !== dernierIndex) {
    resultat.push(donnees[dernierIndex]);
  }
  return resultat;
}

interface DonneeGraphique {
  heure: string;
  valeur: number;
  pointIndex: number;
}

export default function TraceChart({
  points,
  donnee,
  pointActifIndex,
  onHoverPoint,
}: PropsTraceChart) {
  const config = CONFIG_DONNEES[donnee];

  const donneesGraphique = useMemo(
    () =>
      sousechantillonner(
        points
          .filter(
            (p) =>
              p.timestamp != null && (p[config.cle] as number | null) != null
          )
          .map((p, i) => ({
            heure: p.timestamp!,
            valeur: p[config.cle] as number,
            pointIndex: p.pointIndex ?? i,
          })),
        500
      ),
    [points, config.cle]
  );

  // Gradient de couleur par vitesse (uniquement pour donnee === 'vitesse')
  const gradientStops = useMemo(() => {
    if (donnee !== "vitesse") return null;
    const stats = calculerStatsVitesse(
      donneesGraphique.map((d) => d.valeur)
    );
    return donneesGraphique.map((d, i) => ({
      offset: `${(i / Math.max(donneesGraphique.length - 1, 1)) * 100}%`,
      color: vitesseVersCouleur(d.valeur, stats),
    }));
  }, [donneesGraphique, donnee]);

  const heureSurvole = useMemo(() => {
    if (pointActifIndex == null) return null;
    const d = donneesGraphique.find((d) => d.pointIndex === pointActifIndex);
    return d?.heure ?? null;
  }, [pointActifIndex, donneesGraphique]);

  const handleMouseMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      const state = args[0];
      if (state?.activePayload?.[0]?.payload?.pointIndex !== undefined) {
        onHoverPoint(state.activePayload[0].payload.pointIndex);
      } else if (state?.activeLabel) {
        const point = donneesGraphique.find(
          (d) => d.heure === state.activeLabel
        );
        if (point) onHoverPoint(point.pointIndex);
      }
    },
    [onHoverPoint, donneesGraphique]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  if (donneesGraphique.length < 2) {
    return (
      <div className="chart-empty">
        Pas assez de donnees pour afficher le graphique
      </div>
    );
  }

  const strokeId = `gradient-${donnee}`;
  const stroke =
    donnee === "vitesse" ? `url(#${strokeId})` : COULEURS.accent;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{config.titre}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={donneesGraphique}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COULEURS.grille} />
          <XAxis
            dataKey="heure"
            tickFormatter={(t) => format(new Date(t), "HH:mm")}
            tick={{ fontSize: 11 }}
            stroke={COULEURS.texteSecondaire}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke={COULEURS.texteSecondaire}
            width={25}
            domain={config.domaine}
          />
          <Tooltip
            labelFormatter={(t) =>
              format(new Date(t as string), "HH:mm:ss")
            }
            formatter={(value) => [config.formater(Number(value)), config.titre]}
            contentStyle={{
              backgroundColor: COULEURS.fond,
              border: `1px solid ${COULEURS.bordure}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {donnee === "vitesse" && gradientStops && (
            <defs>
              <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
                {gradientStops.map((stop, i) => (
                  <stop
                    key={i}
                    offset={stop.offset}
                    stopColor={stop.color}
                  />
                ))}
              </linearGradient>
            </defs>
          )}
          <Line
            type="monotone"
            dataKey="valeur"
            stroke={stroke}
            dot={false}
            strokeWidth={1.5}
          />
          {heureSurvole && (
            <ReferenceLine
              x={heureSurvole}
              stroke={COULEURS.jaune}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Stats/TraceChart.tsx
git commit -m "feat: TraceChart — graphique multi-donnees (vitesse/cap)"
```

---

## Task 3 : PanneauStats (remplace StatsPanel)

**Files:**
- Create: `src/components/Stats/PanneauStats.tsx`

- [ ] **Step 1: Creer PanneauStats.tsx**

Reprend le layout de `StatsPanel` pour les stats globales, ajoute une zone point actif avec switch de donnee.

```typescript
import { Anchor, Clock, Gauge, Navigation, Compass } from "lucide-react";
import { formaterDuree } from "@/lib/utilitaires";
import type { PointCarte, DonneeGraphee } from "@/lib/types";

interface PropsPanneauStats {
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  pointActif: PointCarte | null;
  donneeGraphee: DonneeGraphee;
  onChangeDonneeGraphee: (d: DonneeGraphee) => void;
  capDisponible: boolean;
}

function StatCard({
  icon: Icone,
  etiquette,
  valeur,
  unite,
}: {
  icon: React.ElementType;
  etiquette: string;
  valeur: string;
  unite: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <Icone className="stat-card-icon" />
        <span className="stat-card-label">{etiquette}</span>
      </div>
      <p className="stat-card-value">
        {valeur}
        <span className="stat-card-unit">{unite}</span>
      </p>
    </div>
  );
}

export default function PanneauStats({
  distanceNm,
  durationSeconds,
  avgSpeedKn,
  maxSpeedKn,
  pointActif,
  donneeGraphee,
  onChangeDonneeGraphee,
  capDisponible,
}: PropsPanneauStats) {
  return (
    <div className="panneau-stats">
      {/* Zone haute — stats globales */}
      <div className="stats-grid">
        <StatCard
          icon={Anchor}
          etiquette="Distance"
          valeur={distanceNm?.toFixed(2) ?? "—"}
          unite="NM"
        />
        <StatCard
          icon={Clock}
          etiquette="Duree"
          valeur={durationSeconds ? formaterDuree(durationSeconds) : "—"}
          unite=""
        />
        <StatCard
          icon={Gauge}
          etiquette="V. moy."
          valeur={avgSpeedKn?.toFixed(1) ?? "—"}
          unite="kn"
        />
        <StatCard
          icon={Navigation}
          etiquette="V. max"
          valeur={maxSpeedKn?.toFixed(1) ?? "—"}
          unite="kn"
        />
      </div>

      {/* Zone basse — point actif */}
      {pointActif && (
        <div className="panneau-stats-point-actif">
          <div className="panneau-stats-separateur" />
          <button
            className={`panneau-stats-donnee ${donneeGraphee === "vitesse" ? "panneau-stats-donnee-active" : ""}`}
            onClick={() => onChangeDonneeGraphee("vitesse")}
            disabled={donneeGraphee === "vitesse"}
          >
            <Gauge className="panneau-stats-donnee-icon" />
            <span className="panneau-stats-donnee-valeur">
              {pointActif.speedKn != null
                ? pointActif.speedKn.toFixed(1)
                : "—"}
            </span>
            <span className="panneau-stats-donnee-unite">kn</span>
          </button>
          <button
            className={`panneau-stats-donnee ${donneeGraphee === "cap" ? "panneau-stats-donnee-active" : ""}`}
            onClick={() => onChangeDonneeGraphee("cap")}
            disabled={donneeGraphee === "cap" || !capDisponible}
            title={!capDisponible ? "Pas de donnees de cap" : undefined}
          >
            <Compass className="panneau-stats-donnee-icon" />
            <span className="panneau-stats-donnee-valeur">
              {pointActif.headingDeg != null
                ? `${Math.round(pointActif.headingDeg)}`
                : "—"}
            </span>
            <span className="panneau-stats-donnee-unite">°</span>
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Stats/PanneauStats.tsx
git commit -m "feat: PanneauStats — stats globales + point actif avec switch donnee"
```

---

## Task 4 : Timeline

**Files:**
- Create: `src/components/Stats/Timeline.tsx`

- [ ] **Step 1: Creer Timeline.tsx**

Slider temporel leger, sans lib externe. Utilise les points downsamplees. Recherche binaire pour trouver le point le plus proche.

```typescript
"use client";

import { useCallback, useRef, useMemo } from "react";
import { format } from "date-fns";
import type { PointCarte } from "@/lib/types";

interface PropsTimeline {
  points: PointCarte[];
  pointActifIndex: number | null;
  onChangeIndex: (index: number) => void;
}

/** Trouve l'index du point avec le timestamp le plus proche */
function trouverPointProche(
  points: { timestamp: number; pointIndex: number }[],
  cible: number
): number {
  let debut = 0;
  let fin = points.length - 1;
  while (debut < fin) {
    const milieu = Math.floor((debut + fin) / 2);
    if (points[milieu].timestamp < cible) {
      debut = milieu + 1;
    } else {
      fin = milieu;
    }
  }
  // Verifier si le point precedent est plus proche
  if (debut > 0) {
    const diffAvant = Math.abs(points[debut - 1].timestamp - cible);
    const diffApres = Math.abs(points[debut].timestamp - cible);
    if (diffAvant < diffApres) return debut - 1;
  }
  return debut;
}

export default function Timeline({
  points,
  pointActifIndex,
  onChangeIndex,
}: PropsTimeline) {
  const barreRef = useRef<HTMLDivElement>(null);

  // Filtrer les points avec timestamp, pre-calculer les timestamps en ms
  const pointsTemporels = useMemo(
    () =>
      points
        .filter((p) => p.timestamp != null)
        .map((p) => ({
          timestamp: new Date(p.timestamp!).getTime(),
          pointIndex: p.pointIndex,
        })),
    [points]
  );

  const tempsDebut = pointsTemporels[0]?.timestamp ?? 0;
  const tempsFin =
    pointsTemporels[pointsTemporels.length - 1]?.timestamp ?? 0;
  const duree = tempsFin - tempsDebut || 1;

  // Position du curseur en pourcentage
  const positionCurseur = useMemo(() => {
    if (pointActifIndex == null || pointsTemporels.length === 0) return null;
    const pt = pointsTemporels.find((p) => p.pointIndex === pointActifIndex);
    if (!pt) return null;
    return ((pt.timestamp - tempsDebut) / duree) * 100;
  }, [pointActifIndex, pointsTemporels, tempsDebut, duree]);

  // Heure du point actif
  const heurePointActif = useMemo(() => {
    if (pointActifIndex == null) return null;
    const pt = pointsTemporels.find((p) => p.pointIndex === pointActifIndex);
    if (!pt) return null;
    return format(new Date(pt.timestamp), "HH:mm:ss");
  }, [pointActifIndex, pointsTemporels]);

  const calculerIndexDepuisPosition = useCallback(
    (clientX: number) => {
      const barre = barreRef.current;
      if (!barre || pointsTemporels.length === 0) return;
      const rect = barre.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const tempsCible = tempsDebut + ratio * duree;
      const idx = trouverPointProche(pointsTemporels, tempsCible);
      onChangeIndex(pointsTemporels[idx].pointIndex);
    },
    [pointsTemporels, tempsDebut, duree, onChangeIndex]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      calculerIndexDepuisPosition(e.clientX);

      const handleMove = (ev: MouseEvent) => {
        calculerIndexDepuisPosition(ev.clientX);
      };
      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [calculerIndexDepuisPosition]
  );

  // Masquer si pas de timestamps
  if (pointsTemporels.length < 2) return null;

  return (
    <div className="timeline">
      <div
        className="timeline-barre"
        ref={barreRef}
        onMouseDown={handleMouseDown}
      >
        <div className="timeline-fond" />
        {positionCurseur != null && (
          <div
            className="timeline-curseur"
            style={{ left: `${positionCurseur}%` }}
          />
        )}
      </div>
      {heurePointActif && (
        <span className="timeline-heure">{heurePointActif}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Stats/Timeline.tsx
git commit -m "feat: Timeline — slider temporel avec recherche binaire"
```

---

## Task 5 : Marqueur directionnel sur TraceMap

**Files:**
- Modify: `src/components/Map/TraceMap.tsx`

- [ ] **Step 1: Modifier TraceMap pour le marqueur directionnel**

Remplacer les props `pointSurvole` par `pointActifIndex` et le dot `.nettoyage-curseur-sync` par un SVG directionnel.

Changements dans `TraceMap.tsx` :

1. Renommer la prop `pointSurvole` → `pointActifIndex` dans l'interface `PropsCarteTrace`
2. Supprimer l'interface locale `PointCarte`, importer depuis `@/lib/types`
3. Remplacer le bloc du marqueur de survol (lignes ~349-358) par :

```typescript
{/* Marqueur directionnel — coque de bateau */}
{pointSurvoleData && (
  <Marker
    longitude={pointSurvoleData.lon}
    latitude={pointSurvoleData.lat}
    anchor="center"
  >
    <div
      className="marqueur-directionnel"
      style={{
        transform: `rotate(${pointSurvoleData.headingDeg ?? 0}deg)`,
      }}
    >
      <svg
        width="20"
        height="30"
        viewBox="0 0 20 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 0 L18 24 Q10 30 2 24 Z"
          fill="#F6BC00"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  </Marker>
)}
```

4. Renommer la variable interne `pointSurvole` → `pointActifIndex` dans `useMemo` pour `pointSurvoleData` (renommer aussi en `pointActifData`)

Note : garder la compatibilite du nom de prop `pointSurvole` dans l'interface (renommer en `pointActifIndex`) et mettre a jour tous les appelants dans les tasks suivantes.

- [ ] **Step 2: Commit**

```bash
git add src/components/Map/TraceMap.tsx
git commit -m "feat: marqueur directionnel (coque bateau) sur TraceMap"
```

---

## Task 6 : CSS — styles timeline, marqueur, point actif

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ajouter les styles dans globals.css**

Apres le bloc `.nettoyage-curseur-sync` (vers ligne 1602), ajouter :

```css
/* === Marqueur directionnel (coque bateau) === */
.marqueur-directionnel {
  pointer-events: none;
  transition: transform 0.15s ease-out;
}

/* === Timeline === */
.timeline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 0;
  height: 24px;
}

.timeline-barre {
  flex: 1;
  position: relative;
  height: 6px;
  cursor: pointer;
  padding: 4px 0;
}

.timeline-fond {
  position: absolute;
  inset: 4px 0;
  height: 6px;
  background: var(--border-light);
  border-radius: 3px;
}

.timeline-curseur {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-yellow);
  border: 2px solid white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.timeline-heure {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  min-width: 56px;
  text-align: right;
}

/* === PanneauStats — point actif === */
.panneau-stats-point-actif {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panneau-stats-separateur {
  height: 1px;
  background: var(--border-light);
  margin: 4px 0;
}

.panneau-stats-donnee {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 2px 0;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
  color: var(--text-secondary);
}

.panneau-stats-donnee:disabled {
  cursor: default;
}

.panneau-stats-donnee-active {
  color: var(--accent);
}

.panneau-stats-donnee-active .panneau-stats-donnee-valeur {
  font-size: clamp(16px, 2.2vw, 22px);
  font-weight: 600;
}

.panneau-stats-donnee-icon {
  width: 14px;
  height: 14px;
}

.panneau-stats-donnee-valeur {
  font-size: clamp(12px, 1.6vw, 16px);
  font-weight: 500;
  transition: font-size 0.15s;
}

.panneau-stats-donnee-unite {
  font-size: clamp(9px, 1.2vw, 11px);
  opacity: 0.7;
}
```

- [ ] **Step 2: Supprimer le style `.nettoyage-curseur-sync`** (lignes 1594-1602)

Ce style est remplace par `.marqueur-directionnel`. Verifier avant que `.nettoyage-curseur-sync` n'est pas utilise dans la vue nettoyage — si oui, le garder uniquement pour cette page.

**Important :** verifier dans `src/app/trace/[id]/nettoyage/` si `.nettoyage-curseur-sync` est encore utilise. Si oui, garder le style et ne pas supprimer.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: styles timeline, marqueur directionnel, point actif"
```

---

## Task 7 : Adapter TraceVueClient aux nouveaux composants

**Files:**
- Modify: `src/components/TraceVueClient.tsx`
- Modify: `src/app/trace/[id]/page.tsx`

- [ ] **Step 1: Refactorer TraceVueClient.tsx**

Remplacer le contenu complet par :

```typescript
"use client";

import { useCallback, useMemo, useState } from "react";
import TraceMapWrapper from "@/components/Map/TraceMapWrapper";
import TraceChart from "@/components/Stats/TraceChart";
import Timeline from "@/components/Stats/Timeline";
import GraphiqueRedimensionnable from "@/components/Stats/GraphiqueRedimensionnable";
import type { PointCarte, DonneeGraphee } from "@/lib/types";

interface PropsTraceVueClient {
  points: PointCarte[];
  maxSpeed: number;
}

const HAUTEUR_GRAPHIQUE_INITIALE = 200;
const MARGE_GRAPHIQUE = 56;

export default function TraceVueClient({
  points,
  maxSpeed,
}: PropsTraceVueClient) {
  const [paddingBas, setPaddingBas] = useState(
    HAUTEUR_GRAPHIQUE_INITIALE + MARGE_GRAPHIQUE
  );
  const [pointActifIndex, setPointActifIndex] = useState<number | null>(null);
  const [donneeGraphee, setDonneeGraphee] = useState<DonneeGraphee>("vitesse");

  // Verifier si des donnees de cap existent
  const capDisponible = useMemo(
    () => points.some((p) => p.headingDeg != null),
    [points]
  );

  const handleHauteurChange = useCallback((hauteur: number) => {
    setPaddingBas(hauteur + MARGE_GRAPHIQUE);
  }, []);

  return (
    <div style={{ "--hauteur-graphique": `${paddingBas}px` } as React.CSSProperties}>
      <div className="trace-vue-carte">
        <TraceMapWrapper
          points={points}
          maxSpeed={maxSpeed}
          paddingBottom={paddingBas}
          pointActifIndex={pointActifIndex}
          onHoverPoint={setPointActifIndex}
        />
      </div>

      <div className="trace-vue-graphique">
        <GraphiqueRedimensionnable
          hauteurInitiale={HAUTEUR_GRAPHIQUE_INITIALE}
          hauteurMin={80}
          hauteurMax={450}
          onHauteurChange={handleHauteurChange}
        >
          <TraceChart
            points={points}
            donnee={donneeGraphee}
            pointActifIndex={pointActifIndex}
            onHoverPoint={setPointActifIndex}
          />
          <Timeline
            points={points}
            pointActifIndex={pointActifIndex}
            onChangeIndex={setPointActifIndex}
          />
        </GraphiqueRedimensionnable>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mettre a jour TraceMapWrapper**

Si `TraceMapWrapper.tsx` passe `pointSurvole` a `TraceMap`, renommer la prop en `pointActifIndex`. Ouvrir `src/components/Map/TraceMapWrapper.tsx` et faire le renommage.

- [ ] **Step 3: Mettre a jour page.tsx de /trace/[id]**

Dans `src/app/trace/[id]/page.tsx` :
- Remplacer `import StatsPanel from "@/components/Stats/StatsPanel"` par `import PanneauStats from "@/components/Stats/PanneauStats"`
- Remplacer le bloc `<StatsPanel ... />` par `<PanneauStats>` avec les nouvelles props. Le `pointActif` et `donneeGraphee` vivent dans `TraceVueClient` (client) mais `PanneauStats` est dans le server component. Il faut donc **deplacer PanneauStats dans TraceVueClient**.

Modifier `TraceVueClient` pour accepter les stats en props et rendre `PanneauStats` dedans :

Ajouter les props stats a `PropsTraceVueClient` :

```typescript
interface PropsTraceVueClient {
  points: PointCarte[];
  maxSpeed: number;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
}
```

Ajouter dans le JSX de `TraceVueClient`, avant la carte :

```typescript
// Calculer le point actif
const pointActif = useMemo(() => {
  if (pointActifIndex == null) return null;
  return points.find((p) => p.pointIndex === pointActifIndex) ?? null;
}, [points, pointActifIndex]);
```

Et dans le return, ajouter le panneau stats :

```tsx
<div className="trace-vue-stats">
  <PanneauStats
    distanceNm={distanceNm}
    durationSeconds={durationSeconds}
    avgSpeedKn={avgSpeedKn}
    maxSpeedKn={maxSpeedKn}
    pointActif={pointActif}
    donneeGraphee={donneeGraphee}
    onChangeDonneeGraphee={setDonneeGraphee}
    capDisponible={capDisponible}
  />
</div>
```

Dans `page.tsx`, supprimer le `<div className="trace-vue-stats">` et passer les stats comme props a `TraceVueClient` :

```tsx
<TraceVueClient
  points={pointsSerialises}
  maxSpeed={trace.maxSpeedKn ?? 10}
  distanceNm={trace.distanceNm}
  durationSeconds={trace.durationSeconds}
  avgSpeedKn={trace.avgSpeedKn}
  maxSpeedKn={trace.maxSpeedKn}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TraceVueClient.tsx src/components/Map/TraceMapWrapper.tsx src/app/trace/[id]/page.tsx
git commit -m "refactor: TraceVueClient utilise TraceChart, PanneauStats, Timeline"
```

---

## Task 8 : Supprimer SpeedChart et StatsPanel

**Files:**
- Delete: `src/components/Stats/SpeedChart.tsx`
- Delete: `src/components/Stats/StatsPanel.tsx`

- [ ] **Step 1: Verifier qu'aucun autre fichier n'importe SpeedChart ou StatsPanel**

```bash
grep -r "SpeedChart\|StatsPanel" src/ --include="*.tsx" --include="*.ts"
```

Si d'autres fichiers les importent (ex: la vue nettoyage), les mettre a jour aussi.

- [ ] **Step 2: Supprimer les fichiers**

```bash
rm src/components/Stats/SpeedChart.tsx
rm src/components/Stats/StatsPanel.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -u src/components/Stats/SpeedChart.tsx src/components/Stats/StatsPanel.tsx
git commit -m "cleanup: suppression SpeedChart et StatsPanel (remplaces)"
```

---

## Task 9 : Route /navigation/[id] — server component

**Files:**
- Create: `src/app/navigation/[id]/page.tsx`
- Create: `src/app/navigation/[id]/loading.tsx`
- Create: `src/app/navigation/[id]/not-found.tsx`

- [ ] **Step 1: Creer page.tsx**

Meme pattern que `/trace/[id]/page.tsx` — requete Prisma directe, include navigation + trace + points + dossier + aventure + bateau.

```typescript
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  obtenirSession,
  estAdmin,
  obtenirIdUtilisateurEffectif,
} from "@/lib/session";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import NavigationVueClient from "@/components/NavigationVueClient";

interface PropsPage {
  params: Promise<{ id: string }>;
}

export default async function NavigationDetailPage({ params }: PropsPage) {
  const session = await obtenirSession();
  if (!session) notFound();

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
    include: {
      dossier: { select: { id: true, nom: true } },
      aventure: { select: { id: true, nom: true } },
      trace: {
        include: {
          points: {
            where: { isExcluded: false },
            orderBy: { pointIndex: "asc" },
          },
          bateau: { select: { id: true, nom: true } },
        },
      },
    },
  });

  if (!navigation) {
    if (session && estAdmin(session)) {
      // Admin peut voir toutes les navigations
      const navAdmin = await prisma.navigation.findUnique({
        where: { id },
        include: {
          dossier: { select: { id: true, nom: true } },
          aventure: { select: { id: true, nom: true } },
          trace: {
            include: {
              points: {
                where: { isExcluded: false },
                orderBy: { pointIndex: "asc" },
              },
              bateau: { select: { id: true, nom: true } },
            },
          },
        },
      });
      if (!navAdmin) notFound();
      return renderPage(navAdmin);
    }
    notFound();
  }

  return renderPage(navigation);
}

function renderPage(navigation: {
  id: string;
  nom: string;
  date: Date;
  type: "SOLO" | "REGATE";
  dossierId: string;
  dossier: { id: string; nom: string };
  aventure: { id: string; nom: string } | null;
  trace: {
    id: string;
    distanceNm: number | null;
    durationSeconds: number | null;
    avgSpeedKn: number | null;
    maxSpeedKn: number | null;
    bateau: { id: string; nom: string } | null;
    points: {
      lat: number;
      lon: number;
      timestamp: Date | null;
      speedKn: number | null;
      headingDeg: number | null;
      pointIndex: number;
    }[];
  } | null;
}) {
  const trace = navigation.trace;
  const pointsSerialises = trace
    ? trace.points.map((p) => ({
        lat: p.lat,
        lon: p.lon,
        timestamp: p.timestamp?.toISOString() ?? null,
        speedKn: p.speedKn,
        headingDeg: p.headingDeg,
        pointIndex: p.pointIndex,
      }))
    : [];

  return (
    <div className="trace-vue-layout">
      {/* Header navigation */}
      <div className="trace-vue-header">
        <Link href="/journal" className="nettoyage-back">
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </Link>
        <div className="trace-vue-header-info">
          <span className="navigation-breadcrumb">
            {navigation.dossier.nom}
            {navigation.aventure && ` > ${navigation.aventure.nom}`}
          </span>
        </div>
      </div>

      {trace && trace.points.length > 0 ? (
        <NavigationVueClient
          navigationId={navigation.id}
          nom={navigation.nom}
          date={navigation.date.toISOString()}
          type={navigation.type}
          bateau={trace.bateau}
          points={pointsSerialises}
          maxSpeed={trace.maxSpeedKn ?? 10}
          distanceNm={trace.distanceNm}
          durationSeconds={trace.durationSeconds}
          avgSpeedKn={trace.avgSpeedKn}
          maxSpeedKn={trace.maxSpeedKn}
        />
      ) : (
        <div className="navigation-vide">
          <p>Aucune trace associee a cette navigation.</p>
          <Link href="/journal">Retour au journal</Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Creer loading.tsx**

```typescript
export default function Loading() {
  return (
    <div className="trace-vue-layout">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p>Chargement...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Creer not-found.tsx**

```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <h1>Navigation introuvable</h1>
      <Link href="/journal">Retour au journal</Link>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/navigation/[id]/page.tsx src/app/navigation/[id]/loading.tsx src/app/navigation/[id]/not-found.tsx
git commit -m "feat: route /navigation/[id] — server component"
```

---

## Task 10 : NavigationVueClient

**Files:**
- Create: `src/components/NavigationVueClient.tsx`

- [ ] **Step 1: Creer NavigationVueClient.tsx**

Fork de `TraceVueClient` avec metadonnees editables. Le header et le breadcrumb sont dans le server component (page.tsx). Le client gere la carte, le graphique, et l'edition des metadonnees.

```typescript
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TraceMapWrapper from "@/components/Map/TraceMapWrapper";
import TraceChart from "@/components/Stats/TraceChart";
import Timeline from "@/components/Stats/Timeline";
import PanneauStats from "@/components/Stats/PanneauStats";
import GraphiqueRedimensionnable from "@/components/Stats/GraphiqueRedimensionnable";
import type { PointCarte, DonneeGraphee } from "@/lib/types";

interface PropsNavigationVueClient {
  navigationId: string;
  nom: string;
  date: string;
  type: "SOLO" | "REGATE";
  bateau: { id: string; nom: string } | null;
  points: PointCarte[];
  maxSpeed: number;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
}

const HAUTEUR_GRAPHIQUE_INITIALE = 200;
const MARGE_GRAPHIQUE = 56;

export default function NavigationVueClient({
  navigationId,
  nom,
  date,
  type,
  bateau,
  points,
  maxSpeed,
  distanceNm,
  durationSeconds,
  avgSpeedKn,
  maxSpeedKn,
}: PropsNavigationVueClient) {
  const router = useRouter();
  const [paddingBas, setPaddingBas] = useState(
    HAUTEUR_GRAPHIQUE_INITIALE + MARGE_GRAPHIQUE
  );
  const [pointActifIndex, setPointActifIndex] = useState<number | null>(null);
  const [donneeGraphee, setDonneeGraphee] = useState<DonneeGraphee>("vitesse");

  // Edition metadonnees
  const [nomEdite, setNomEdite] = useState(nom);
  const [enEditionNom, setEnEditionNom] = useState(false);

  const capDisponible = useMemo(
    () => points.some((p) => p.headingDeg != null),
    [points]
  );

  const pointActif = useMemo(() => {
    if (pointActifIndex == null) return null;
    return points.find((p) => p.pointIndex === pointActifIndex) ?? null;
  }, [points, pointActifIndex]);

  const handleHauteurChange = useCallback((hauteur: number) => {
    setPaddingBas(hauteur + MARGE_GRAPHIQUE);
  }, []);

  const sauvegarderNom = useCallback(async () => {
    const nomNettoye = nomEdite.trim();
    if (!nomNettoye || nomNettoye === nom) {
      setNomEdite(nom);
      setEnEditionNom(false);
      return;
    }
    try {
      const reponse = await fetch(`/api/journal/navigations/${navigationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nomNettoye }),
      });
      if (!reponse.ok) throw new Error();
      setEnEditionNom(false);
      router.refresh();
    } catch {
      setNomEdite(nom);
      setEnEditionNom(false);
    }
  }, [nomEdite, nom, navigationId, router]);

  const dateFormatee = new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ "--hauteur-graphique": `${paddingBas}px` } as React.CSSProperties}>
      {/* Panneau stats + metadonnees navigation */}
      <div className="trace-vue-stats">
        <div className="navigation-meta">
          {enEditionNom ? (
            <input
              className="titre-editable-input"
              value={nomEdite}
              onChange={(e) => setNomEdite(e.target.value)}
              onBlur={sauvegarderNom}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); sauvegarderNom(); }
                if (e.key === "Escape") { setNomEdite(nom); setEnEditionNom(false); }
              }}
              autoFocus
            />
          ) : (
            <h2
              className="navigation-nom titre-editable"
              onClick={() => setEnEditionNom(true)}
              title="Cliquer pour renommer"
            >
              {nom}
            </h2>
          )}
          <div className="navigation-meta-details">
            <span>{dateFormatee}</span>
            <span className={`badge-type badge-type-${type.toLowerCase()}`}>
              {type === "REGATE" ? "Regate" : "Solo"}
            </span>
            {bateau && <span>{bateau.nom}</span>}
          </div>
        </div>
        <PanneauStats
          distanceNm={distanceNm}
          durationSeconds={durationSeconds}
          avgSpeedKn={avgSpeedKn}
          maxSpeedKn={maxSpeedKn}
          pointActif={pointActif}
          donneeGraphee={donneeGraphee}
          onChangeDonneeGraphee={setDonneeGraphee}
          capDisponible={capDisponible}
        />
      </div>

      {/* Carte */}
      <div className="trace-vue-carte">
        <TraceMapWrapper
          points={points}
          maxSpeed={maxSpeed}
          paddingBottom={paddingBas}
          pointActifIndex={pointActifIndex}
          onHoverPoint={setPointActifIndex}
        />
      </div>

      {/* Graphique + timeline */}
      <div className="trace-vue-graphique">
        <GraphiqueRedimensionnable
          hauteurInitiale={HAUTEUR_GRAPHIQUE_INITIALE}
          hauteurMin={80}
          hauteurMax={450}
          onHauteurChange={handleHauteurChange}
        >
          <TraceChart
            points={points}
            donnee={donneeGraphee}
            pointActifIndex={pointActifIndex}
            onHoverPoint={setPointActifIndex}
          />
          <Timeline
            points={points}
            pointActifIndex={pointActifIndex}
            onChangeIndex={setPointActifIndex}
          />
        </GraphiqueRedimensionnable>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NavigationVueClient.tsx
git commit -m "feat: NavigationVueClient — vue immersive navigation"
```

---

## Task 11 : CSS navigation + breadcrumb

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ajouter les styles navigation**

Apres les styles timeline ajoutes en Task 6 :

```css
/* === Vue navigation — metadonnees === */
.navigation-meta {
  margin-bottom: 8px;
}

.navigation-nom {
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.navigation-meta-details {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--text-light);
  margin-top: 2px;
}

.navigation-meta-details span + span::before {
  content: "·";
  margin-right: 8px;
}

.navigation-breadcrumb {
  font-size: 12px;
  color: var(--text-secondary);
}

.navigation-vide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  color: var(--text-secondary);
}

.navigation-vide a {
  color: var(--accent);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: styles vue navigation (metadonnees, breadcrumb)"
```

---

## Task 12 : Lien journal → /navigation/[id]

**Files:**
- Modify: `src/components/Journal/CarteNavigation.tsx`

- [ ] **Step 1: Changer le lien dans CarteNavigation**

Dans `CarteNavigation.tsx`, modifier le `onClick` (ligne 37-38) :

Ancien :
```typescript
if (navigation.trace) routeur.push(`/trace/${navigation.trace.id}`);
```

Nouveau :
```typescript
routeur.push(`/navigation/${navigation.id}`);
```

Le clic navigue desormais vers `/navigation/[id]` que la navigation ait une trace ou non (la page affichera un etat vide si pas de trace).

- [ ] **Step 2: Retirer la condition `navigation.trace` du className cliquable**

Ligne 34, remplacer :
```typescript
className={`carte-navigation ${navigation.trace ? "carte-navigation-cliquable" : ""}`}
```

Par :
```typescript
className="carte-navigation carte-navigation-cliquable"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Journal/CarteNavigation.tsx
git commit -m "feat: lien journal → /navigation/[id]"
```

---

## Task 13 : Build + verification

- [ ] **Step 1: Verifier les imports**

```bash
grep -r "SpeedChart\|StatsPanel" src/ --include="*.tsx" --include="*.ts"
```

Attendu : aucun resultat (tous les imports ont ete mis a jour).

- [ ] **Step 2: Build**

```bash
npm run build
```

Attendu : build sans erreur.

- [ ] **Step 3: Verifier manuellement**

1. Ouvrir `/trace/{id}` — verifier : carte + graphique multi-donnees + timeline + panneau stats enrichi + marqueur directionnel
2. Ouvrir `/journal` — cliquer sur une navigation → doit naviguer vers `/navigation/{id}`
3. Ouvrir `/navigation/{id}` — verifier : breadcrumb, metadonnees editables, carte + graphique + timeline + panneau stats
4. Tester le switch vitesse/cap dans le panneau stats
5. Tester le drag de la timeline
6. Verifier le marqueur directionnel s'oriente selon le cap

- [ ] **Step 4: Commit final si corrections**

```bash
git add -A
git commit -m "fix: corrections build Phase 3b"
```
