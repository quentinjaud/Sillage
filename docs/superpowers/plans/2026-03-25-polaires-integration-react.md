# Integration editeur de polaires dans Sillage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter l'editeur de polaires standalone (vanilla HTML/CSS/JS) en composants React integres a Sillage, avec fonctions reutilisables pour la future analyse de performance.

**Architecture:** Route `/polaires` accessible depuis le menu user (tout utilisateur). Logique metier extraite dans `src/lib/polaires/` (parseur .POL, interpolation bilineaire, splines Catmull-Rom). UI en 3 composants React : diagramme SVG, tableau editable, selecteur de reference. CSS dans `globals.css`. Fichiers .POL statiques dans `public/polarlib/`.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS vanilla, SVG

---

## Structure de fichiers

```
src/lib/polaires/
  types.ts              — types TypeScript (DonneesPolaire, EtatEditeur, etc.)
  constantes.ts         — COULEURS_TWS, VIEWBOX_DEFAUT, donnees Sunlight 30
  parseur-pol.ts        — parsePOL(), exportPOL(), validateNavimetrix()
  interpolation.ts      — getRefSpeed() interpolation bilineaire TWA x TWS
  geometrie-polaire.ts  — catmullRomPath(), coordPolaire(), calculsVentApparent()

src/app/polaires/
  page.tsx              — route server (auth check, redirect si non connecte)

src/components/Polaires/
  EditeurPolaires.tsx    — composant principal, state useReducer, layout 2 colonnes
  DiagrammePolaire.tsx   — SVG interactif (courbes, grille, tooltip, zoom/pan)
  TableauPolaire.tsx     — tableau editable avec inputs, refs, delta
  LegendePolaire.tsx     — checkboxes TWS, toggle apparent, nom ref
  BarreOutilsPolaires.tsx — toolbar (nom polaire, import/export, select ref)

src/app/globals.css     — ajout section polaires (~200 lignes)

public/polarlib/        — 496 fichiers .POL (deja en place, on supprime public/polaires/)
```

## Decisions de design

- **useReducer** au lieu de useState multiples : l'etat polaire (tws, twa, speeds, ref, visibleTWS, dirty, etc.) est complexe et interdependant — un reducer centralise les mutations
- **SVG en JSX** : le diagramme genere du SVG via React, pas via innerHTML. Le zoom/pan reste imperatif (useRef + event listeners sur le SVG)
- **Inputs controles** : les cellules du tableau sont des `<input type="text">` au lieu de `contenteditable`. Edition au focus, validation au blur
- **Pas de Mantine** pour cette page : elle a son propre look (toolbar bleue, fond creme) comme l'admin. CSS vanilla dans globals.css
- **Convention CSS** : les classes de layout/UI sont prefixees `polaires-` pour eviter les collisions. Les classes SVG internes (`.grid-circle`, `.polar-curve`, `.polar-dot`, etc.) ne sont PAS prefixees car elles n'existent que dans le SVG inline et ne risquent pas de collision
- **Fichiers .POL dans public/** : pas de base de donnees pour les polaires de reference. On garde le fetch statique
- **Pas de barrel export** : les imports se font directement depuis chaque fichier (`@/lib/polaires/types`, `@/lib/polaires/parseur-pol`, etc.)

---

### Task 1 : Types et constantes

**Files:**
- Create: `src/lib/polaires/types.ts`
- Create: `src/lib/polaires/constantes.ts`

- [ ] **Step 1: Creer les types TypeScript**

```typescript
// src/lib/polaires/types.ts
export interface DonneesPolaire {
  tws: number[];
  twa: number[];
  speeds: number[][]; // speeds[twaIdx][twsIdx]
}

export interface PolaireReference extends DonneesPolaire {
  nom: string;
}

export interface EtatEditeur {
  tws: number[];
  twa: number[];
  speeds: number[][];
  nom: string;
  dirty: boolean;
  visibleTWS: Set<number>; // indices TWS visibles sur le diagramme
  montrerApparent: boolean;
  ref: PolaireReference | null;
  modeRef: 'absolu' | 'delta';
  avertissements: string[];
}

export type ActionEditeur =
  | { type: 'CHARGER'; donnees: DonneesPolaire; nom: string }
  | { type: 'MODIFIER_VITESSE'; ri: number; ci: number; valeur: number }
  | { type: 'AJOUTER_TWA'; angle: number }
  | { type: 'AJOUTER_TWS'; vitesse: number }
  | { type: 'SUPPRIMER_TWA'; ri: number }
  | { type: 'SUPPRIMER_TWS'; ci: number }
  | { type: 'TOGGLE_TWS'; ci: number }
  | { type: 'TOUT_TWS' }
  | { type: 'AUCUN_TWS' }
  | { type: 'TOGGLE_APPARENT' }
  | { type: 'CHARGER_REF'; ref: PolaireReference }
  | { type: 'EFFACER_REF' }
  | { type: 'MODE_REF'; mode: 'absolu' | 'delta' }
  | { type: 'SET_AVERTISSEMENTS'; liste: string[] };

export interface PointCourbe {
  x: number;
  y: number;
  twa: number;
  bs: number;
  awa?: number;
  aws?: number;
}
```

- [ ] **Step 2: Creer les constantes**

```typescript
// src/lib/polaires/constantes.ts
export const COULEURS_TWS = [
  '#aaa',    // TWS=0 (gris)
  '#2196F3', '#0D47A1', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#FFEB3B', '#FF9800',
  '#FF5722', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#795548', '#607D8B',
];

export const VIEWBOX_DEFAUT = { x: -40, y: -250, w: 290, h: 500 };

export const SCALE_RADIUS = 210;

export const DONNEES_SUNLIGHT30 = {
  tws: [0, 6, 8, 10, 12, 14, 16, 20, 25, 30, 40],
  twa: [0, 32, 52, 60, 75, 90, 110, 120, 135, 150, 170, 180],
  speeds: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2.2, 2.9, 3.6, 4.2, 4.5, 4.6, 4.7, 4.5, 4.1, 2.3],
    [0, 3.8, 4.7, 5.3, 5.9, 6.2, 6.3, 6.4, 6.3, 6.0, 5.4],
    [0, 4.1, 5.0, 5.7, 6.2, 6.4, 6.6, 6.6, 6.6, 6.3, 5.8],
    [0, 4.3, 5.2, 5.9, 6.3, 6.6, 6.8, 7.0, 7.0, 6.7, 6.2],
    [0, 4.5, 5.5, 6.2, 6.6, 6.8, 6.9, 7.3, 7.3, 7.1, 6.6],
    [0, 4.5, 5.6, 6.3, 6.7, 7.0, 7.3, 7.8, 7.9, 7.9, 7.5],
    [0, 4.4, 5.4, 6.2, 6.6, 6.9, 7.2, 7.9, 8.3, 8.3, 8.1],
    [0, 4.1, 5.1, 5.9, 6.4, 6.7, 7.1, 7.7, 8.3, 8.6, 8.5],
    [0, 3.3, 4.3, 5.0, 5.7, 6.1, 6.4, 6.9, 8.1, 9.3, 9.9],
    [0, 2.7, 3.5, 4.3, 5.1, 5.6, 6.0, 6.4, 7.2, 8.2, 9.3],
    [0, 2.5, 3.3, 4.0, 4.8, 5.4, 5.8, 6.2, 6.9, 7.7, 8.5],
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/polaires/types.ts src/lib/polaires/constantes.ts
git commit -m "feat(polaires): types et constantes"
```

---

### Task 2 : Parseur .POL et validation

**Files:**
- Create: `src/lib/polaires/parseur-pol.ts`

- [ ] **Step 1: Ecrire le parseur et l'export**

Porter `parsePOLData()`, `parsePOL()`, `handleExport()` et `validateNavimetrix()` du standalone.

```typescript
// src/lib/polaires/parseur-pol.ts
import type { DonneesPolaire } from './types';

/**
 * Parse un fichier .POL (format NavimetriX tab-delimited).
 * Header : TWA\TWS<tab>v1<tab>v2...
 * Data   : angle<tab>spd1<tab>spd2...
 */
export function parsePOL(texte: string): DonneesPolaire {
  const lignes = texte.trim().replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
  if (lignes.length < 2) throw new Error('Fichier vide ou trop court');

  const cellsHeader = lignes[0].split('\t');
  if (!cellsHeader[0].includes('TWA') || !cellsHeader[0].includes('TWS')) {
    throw new Error('Header invalide (attendu: TWA\\TWS)');
  }

  const tws = cellsHeader.slice(1).map((v, i) => {
    const n = parseFloat(v.trim());
    if (isNaN(n)) throw new Error(`TWS invalide colonne ${i + 2}: "${v}"`);
    return n;
  });

  const twa: number[] = [];
  const speeds: number[][] = [];

  for (let i = 1; i < lignes.length; i++) {
    const cells = lignes[i].split('\t');
    const angle = parseFloat(cells[0].trim());
    if (isNaN(angle)) throw new Error(`TWA invalide ligne ${i + 1}: "${cells[0]}"`);

    const row = cells.slice(1).map((v, j) => {
      const n = parseFloat(v.trim());
      if (isNaN(n)) throw new Error(`Vitesse invalide ligne ${i + 1}, col ${j + 2}: "${v}"`);
      return n;
    });

    while (row.length < tws.length) row.push(0);
    if (row.length > tws.length) row.length = tws.length;

    twa.push(angle);
    speeds.push(row);
  }

  return { tws, twa, speeds };
}

/**
 * Exporte des donnees polaires au format .POL (tab-delimited).
 */
export function exportPOL(donnees: DonneesPolaire): string {
  const { tws, twa, speeds } = donnees;
  let contenu = 'TWA\\TWS';
  tws.forEach(v => { contenu += '\t' + v; });
  contenu += '\n';

  twa.forEach((angle, ri) => {
    contenu += angle.toString();
    speeds[ri].forEach(spd => { contenu += '\t' + spd.toFixed(1); });
    contenu += '\n';
  });

  return contenu;
}

/**
 * Valide les donnees pour compatibilite NavimetriX.
 */
export function validerNavimetrix(donnees: DonneesPolaire): string[] {
  const w: string[] = [];
  if (donnees.tws.length === 0 || donnees.tws[0] !== 0) {
    w.push('Il est recommande que la premiere valeur de TWS soit 0.');
  }
  if (donnees.tws.length === 0 || donnees.tws[donnees.tws.length - 1] < 40) {
    w.push('Il est recommande que la derniere valeur de TWS soit >= 40.');
  }
  if (donnees.twa.length === 0 || donnees.twa[0] !== 0) {
    w.push('Il est recommande que la premiere valeur de TWA soit 0.');
  }
  return w;
}

/**
 * Trie les TWA et TWS par ordre croissant, reordonne la matrice de vitesses.
 */
export function trierDonnees(donnees: DonneesPolaire): DonneesPolaire {
  // Trier les lignes TWA
  const combined = donnees.twa.map((angle, i) => ({ angle, row: donnees.speeds[i] }));
  combined.sort((a, b) => a.angle - b.angle);
  const twa = combined.map(c => c.angle);
  let speeds = combined.map(c => c.row);

  // Trier les colonnes TWS
  const twsOrder = donnees.tws.map((v, i) => ({ v, i }));
  twsOrder.sort((a, b) => a.v - b.v);
  const tws = twsOrder.map(o => o.v);
  speeds = speeds.map(row => twsOrder.map(o => row[o.i]));

  return { tws, twa, speeds };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/polaires/parseur-pol.ts
git commit -m "feat(polaires): parseur POL, export, validation, tri"
```

---

### Task 3 : Interpolation et geometrie

**Files:**
- Create: `src/lib/polaires/interpolation.ts`
- Create: `src/lib/polaires/geometrie-polaire.ts`

- [ ] **Step 1: Ecrire l'interpolation bilineaire**

```typescript
// src/lib/polaires/interpolation.ts
import type { DonneesPolaire } from './types';

/**
 * Interpolation bilineaire TWA x TWS sur une polaire de reference.
 * Retourne null si hors bornes.
 */
export function getRefSpeed(ref: DonneesPolaire, angle: number, twsVal: number): number | null {
  const { twa, tws, speeds } = ref;

  if (angle < twa[0] || angle > twa[twa.length - 1]) return null;
  let ri0 = 0;
  for (let i = 0; i < twa.length - 1; i++) {
    if (twa[i] <= angle && angle <= twa[i + 1]) { ri0 = i; break; }
  }
  const ri1 = twa[ri0] === angle ? ri0 : ri0 + 1;
  const twaFrac = ri0 === ri1 ? 0 : (angle - twa[ri0]) / (twa[ri1] - twa[ri0]);

  if (twsVal < tws[0] || twsVal > tws[tws.length - 1]) return null;
  let ci0 = 0;
  for (let i = 0; i < tws.length - 1; i++) {
    if (tws[i] <= twsVal && twsVal <= tws[i + 1]) { ci0 = i; break; }
  }
  const ci1 = tws[ci0] === twsVal ? ci0 : ci0 + 1;
  const twsFrac = ci0 === ci1 ? 0 : (twsVal - tws[ci0]) / (tws[ci1] - tws[ci0]);

  const v00 = speeds[ri0][ci0];
  const v01 = speeds[ri0][ci1];
  const v10 = speeds[ri1][ci0];
  const v11 = speeds[ri1][ci1];
  const top = v00 + (v01 - v00) * twsFrac;
  const bot = v10 + (v11 - v10) * twsFrac;
  return top + (bot - top) * twaFrac;
}
```

- [ ] **Step 2: Ecrire les fonctions de geometrie**

```typescript
// src/lib/polaires/geometrie-polaire.ts
import type { PointCourbe } from './types';

/**
 * Catmull-Rom spline → SVG cubic bezier path string.
 */
export function catmullRomPath(pts: { x: number; y: number }[], tension = 0.5): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }

  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  const n = pts.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 >= n ? n - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / (6 / tension);
    const cp1y = p1.y + (p2.y - p0.y) / (6 / tension);
    const cp2x = p2.x - (p3.x - p1.x) / (6 / tension);
    const cp2y = p2.y - (p3.y - p1.y) / (6 / tension);

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Convertit un angle TWA + vitesse en coordonnees SVG (demi-cercle droit).
 */
export function coordPolaire(angleDeg: number, vitesse: number, echelle: number): { x: number; y: number } {
  const rad = angleDeg * Math.PI / 180;
  const r = vitesse * echelle;
  return { x: Math.sin(rad) * r, y: -Math.cos(rad) * r };
}

/**
 * Calcule AWA et AWS a partir de TWA, TWS et Bs.
 */
export function calculerVentApparent(twaDeg: number, tws: number, bs: number): { awa: number; aws: number } {
  const twaRad = twaDeg * Math.PI / 180;
  const awx = tws * Math.sin(twaRad);
  const awy = tws * Math.cos(twaRad) + bs;
  const aws = Math.sqrt(awx * awx + awy * awy);
  const awa = Math.atan2(awx, awy) * 180 / Math.PI;
  return { awa: Math.round(awa * 10) / 10, aws: Math.round(aws * 10) / 10 };
}

/**
 * Determine un pas d'echelle "propre" pour les cercles de vitesse.
 */
export function pasEchelle(max: number): number {
  if (max <= 5) return 1;
  if (max <= 12) return 2;
  return 5;
}

/**
 * Construit les points d'une courbe polaire pour un TWS donne.
 */
export function construirePointsCourbe(
  twa: number[],
  speeds: number[][],
  ci: number,
  tws: number,
  echelle: number,
): PointCourbe[] {
  const pts: PointCourbe[] = [];
  twa.forEach((angle, ri) => {
    const spd = speeds[ri][ci];
    if (spd <= 0) return;
    const { x, y } = coordPolaire(angle, spd, echelle);
    const { awa, aws } = ventApparent(angle, tws, spd);
    pts.push({ x, y, twa: angle, bs: spd, awa, aws });
  });
  return pts;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/polaires/interpolation.ts src/lib/polaires/geometrie-polaire.ts
git commit -m "feat(polaires): interpolation bilineaire + geometrie SVG"
```

---

### Task 4 : Reducer et etat de l'editeur

**Files:**
- Create: `src/lib/polaires/reducer.ts`

- [ ] **Step 1: Ecrire le reducer**

```typescript
// src/lib/polaires/reducer.ts
import type { EtatEditeur, ActionEditeur } from './types';
import { trierDonnees } from './parseur-pol';
import { DONNEES_SUNLIGHT30 } from './constantes';

export function creerEtatInitial(): EtatEditeur {
  const d = DONNEES_SUNLIGHT30;
  return {
    tws: [...d.tws],
    twa: [...d.twa],
    speeds: d.speeds.map(r => [...r]),
    nom: 'Sunlight 30',
    dirty: false,
    visibleTWS: new Set(d.tws.map((_, i) => i).filter(i => d.tws[i] > 0)),
    montrerApparent: false,
    ref: null,
    modeRef: 'absolu',
    avertissements: [],
  };
}

export function reducerEditeur(state: EtatEditeur, action: ActionEditeur): EtatEditeur {
  switch (action.type) {
    case 'CHARGER': {
      const visibleTWS = new Set(action.donnees.tws.map((_, i) => i).filter(i => action.donnees.tws[i] > 0));
      return {
        ...state,
        tws: action.donnees.tws,
        twa: action.donnees.twa,
        speeds: action.donnees.speeds,
        nom: action.nom,
        dirty: false,
        visibleTWS,
        avertissements: [],
      };
    }

    case 'MODIFIER_VITESSE': {
      const speeds = state.speeds.map(r => [...r]);
      speeds[action.ri][action.ci] = action.valeur;
      return { ...state, speeds, dirty: true };
    }

    case 'AJOUTER_TWA': {
      if (state.twa.includes(action.angle)) return state;
      const twa = [...state.twa, action.angle];
      const speeds = [...state.speeds.map(r => [...r]), new Array(state.tws.length).fill(0)];
      const tri = trierDonnees({ tws: [...state.tws], twa, speeds });
      return {
        ...state,
        twa: tri.twa,
        speeds: tri.speeds,
        dirty: true,
        // visibleTWS inchange : ajout de ligne ne modifie pas les colonnes TWS
      };
    }

    case 'AJOUTER_TWS': {
      if (state.tws.includes(action.vitesse)) return state;
      const tws = [...state.tws, action.vitesse];
      const speeds = state.speeds.map(r => [...r, 0]);
      const tri = trierDonnees({ tws, twa: [...state.twa], speeds });
      const visibleTWS = new Set(tri.tws.map((_, i) => i).filter(i => tri.tws[i] > 0));
      return { ...state, tws: tri.tws, twa: tri.twa, speeds: tri.speeds, dirty: true, visibleTWS };
    }

    case 'SUPPRIMER_TWA': {
      if (state.twa[action.ri] === 0) return state;
      const twa = state.twa.filter((_, i) => i !== action.ri);
      const speeds = state.speeds.filter((_, i) => i !== action.ri);
      return { ...state, twa, speeds, dirty: true };
    }

    case 'SUPPRIMER_TWS': {
      if (state.tws[action.ci] === 0) return state;
      const tws = state.tws.filter((_, i) => i !== action.ci);
      const speeds = state.speeds.map(r => r.filter((_, i) => i !== action.ci));
      const visibleTWS = new Set<number>();
      state.visibleTWS.forEach(oldIdx => {
        if (oldIdx === action.ci) return;
        const newIdx = oldIdx > action.ci ? oldIdx - 1 : oldIdx;
        if (tws[newIdx] > 0) visibleTWS.add(newIdx);
      });
      return { ...state, tws, speeds, dirty: true, visibleTWS };
    }

    case 'TOGGLE_TWS': {
      const visibleTWS = new Set(state.visibleTWS);
      if (visibleTWS.has(action.ci)) visibleTWS.delete(action.ci);
      else visibleTWS.add(action.ci);
      return { ...state, visibleTWS };
    }

    case 'TOUT_TWS': {
      const visibleTWS = new Set(state.tws.map((_, i) => i).filter(i => state.tws[i] > 0));
      return { ...state, visibleTWS };
    }

    case 'AUCUN_TWS':
      return { ...state, visibleTWS: new Set() };

    case 'TOGGLE_APPARENT':
      return { ...state, montrerApparent: !state.montrerApparent };

    case 'CHARGER_REF':
      return { ...state, ref: action.ref };

    case 'EFFACER_REF':
      return { ...state, ref: null };

    case 'MODE_REF':
      return { ...state, modeRef: action.mode };

    case 'SET_AVERTISSEMENTS':
      return { ...state, avertissements: action.liste };

    default:
      return state;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/polaires/reducer.ts
git commit -m "feat(polaires): reducer centralise pour l'etat editeur"
```

---

### Task 5 : Composant DiagrammePolaire (SVG)

**Files:**
- Create: `src/components/Polaires/DiagrammePolaire.tsx`

- [ ] **Step 1: Creer le diagramme SVG**

Ce composant recoit l'etat en props et genere le SVG. Le zoom/pan est gere par useRef + listeners imperatifs.

Points cles du port :
- La grille (cercles, lignes radiales, labels) est generee en JSX
- Les courbes polaires utilisent `catmullRomPath()` de geometrie-polaire.ts
- Les dots interactifs ont des `data-*` attributes pour le tooltip
- Le tooltip est positionne via `createSVGPoint().matrixTransform()`
- Le zoom/pan utilise le meme pattern wheel + mousedown/move/up + dblclick reset
- Les courbes de reference sont grises avec opacite
- Les courbes de vent apparent sont en pointilles

Le composant doit :
1. Generer la grille SVG (semi-cercles, lignes 30°, labels vitesse/angle)
2. Generer les courbes polaires (une path par TWS visible)
3. Generer les dots interactifs sur chaque point de donnee
4. Generer les courbes de reference (si ref chargee)
5. Generer les courbes de vent apparent (si toggle actif)
6. Gerer le tooltip au mousemove (snap au dot le plus proche, distance max 30 SVG units)
7. Gerer le zoom wheel + pan drag + reset double-click

Le SVG utilise `viewBox` dynamique stocke dans un `useRef` (pas dans le state React — trop de re-renders sinon). Les fonctions `applyViewBox()` modifient directement l'attribut du SVG.

Reproduire fidelement le code des lignes 346-690 de `public/polaires/polaires.js`.

- [ ] **Step 2: Commit**

```bash
git add src/components/Polaires/DiagrammePolaire.tsx
git commit -m "feat(polaires): composant DiagrammePolaire SVG interactif"
```

---

### Task 6 : Composant TableauPolaire

**Files:**
- Create: `src/components/Polaires/TableauPolaire.tsx`

- [ ] **Step 1: Creer le tableau editable**

Port des lignes 136-340 de `public/polaires/polaires.js`.

Points cles :
- Chaque cellule de vitesse est un `<input type="text">` (pas contenteditable)
- Validation au blur : parseFloat, >=0, sinon retour a la valeur precedente avec flash rouge
- Navigation Tab naturelle entre inputs
- Enter = blur (valide)
- Escape = restaurer l'ancienne valeur
- Boutons × pour supprimer lignes TWA et colonnes TWS (visibles au hover de la ligne/colonne)
- Mode reference : affichage de la valeur ref en gris sous la valeur principale (mode absolu) ou delta colore (mode delta)
- Colonnes TWS=0 cachees, lignes TWA=0 cachees
- Colonnes dimmees quand le TWS n'est pas visible dans la legende
- L'interpolation `getRefSpeed()` est appelee pour chaque cellule si ref chargee

Dispatch les actions `MODIFIER_VITESSE`, `SUPPRIMER_TWA`, `SUPPRIMER_TWS` vers le reducer parent.

- [ ] **Step 2: Commit**

```bash
git add src/components/Polaires/TableauPolaire.tsx
git commit -m "feat(polaires): composant TableauPolaire editable"
```

---

### Task 7 : Composants Legende et BarreOutils

**Files:**
- Create: `src/components/Polaires/LegendePolaire.tsx`
- Create: `src/components/Polaires/BarreOutilsPolaires.tsx`

- [ ] **Step 1: Creer la legende**

Port des lignes 692-749 de `public/polaires/polaires.js`.

- Checkboxes par TWS avec pastille de couleur
- Boutons "Tout" / "Aucun"
- Toggle vent apparent avec icone pointillee
- Affichage du nom de la ref si chargee
- Dispatch `TOGGLE_TWS`, `TOUT_TWS`, `AUCUN_TWS`, `TOGGLE_APPARENT`

- [ ] **Step 2: Creer la barre d'outils**

Port du header HTML + lignes 755-861 de `public/polaires/polaires.js`.

- Squiggle SVG (lien retour `/journal`)
- Titre "Editeur de polaires"
- Bouton avec le nom de la polaire courante (clic = importer un .pol)
- Select de reference (fetch `polarlib/index.json`, option "Importer une ref...")
- Bouton "Exporter .pol"
- Toggle ref-mode (Absolu / ±Delta) — visible seulement si ref chargee
- Input file caches pour import polaire et import ref

Fonctions d'import/export :
- Import : FileReader → parsePOL() → dispatch CHARGER
- Export : exportPOL() → Blob → download
- Ref : fetch .pol depuis `/polaires/polarlib/` → parsePOL() → dispatch CHARGER_REF
  (le chemin sera mis a jour vers `/polarlib/` dans Task 11 quand on deplace le dossier)

- [ ] **Step 3: Commit**

```bash
git add src/components/Polaires/LegendePolaire.tsx src/components/Polaires/BarreOutilsPolaires.tsx
git commit -m "feat(polaires): legende interactive + barre outils import/export/ref"
```

---

### Task 8 : Composant EditeurPolaires (assemblage)

**Files:**
- Create: `src/components/Polaires/EditeurPolaires.tsx`

- [ ] **Step 1: Assembler l'editeur**

Composant principal `"use client"` qui :
1. Initialise l'etat avec `useReducer(reducerEditeur, undefined, creerEtatInitial)`
2. Gere le `beforeunload` pour avertir si dirty
3. Layout 2 colonnes : diagramme (sticky, gauche) + tableau (scroll, droite)
4. Passe l'etat et dispatch a chaque sous-composant
5. Barre d'avertissements en haut si `avertissements.length > 0`

Structure JSX :
```
<BarreOutilsPolaires />
<div class="polaires-avertissements" />  (si avertissements)
<main class="polaires-editeur">
  <section class="polaires-editeur__chart">
    <DiagrammePolaire />
    <LegendePolaire />
  </section>
  <section class="polaires-editeur__table">
    <TableauPolaire />
    <div class="polaires-table-actions">
      boutons "+ Ligne TWA" / "+ Colonne TWS"
    </div>
  </section>
</main>
```

Les boutons "+ Ligne TWA" / "+ Colonne TWS" utilisent `prompt()` comme le standalone (simple et fonctionnel). Dispatch `AJOUTER_TWA` / `AJOUTER_TWS`.

- [ ] **Step 2: Commit**

```bash
git add src/components/Polaires/EditeurPolaires.tsx
git commit -m "feat(polaires): composant EditeurPolaires assemblage complet"
```

---

### Task 9 : Route Next.js et menu

**Files:**
- Create: `src/app/polaires/page.tsx`
- Modify: `src/components/MenuUtilisateur.tsx`

- [ ] **Step 1: Creer la page**

```typescript
// src/app/polaires/page.tsx
export const dynamic = "force-dynamic";

import { obtenirSession } from "@/lib/session";
import { redirect } from "next/navigation";
import EditeurPolaires from "@/components/Polaires/EditeurPolaires";

export default async function PagePolaires() {
  const session = await obtenirSession();
  if (!session) {
    redirect("/");
  }

  return <EditeurPolaires />;
}
```

- [ ] **Step 2: Ajouter l'item au menu user**

Dans `MenuUtilisateur.tsx`, ajouter un item "Polaires" avant le divider admin :

```tsx
// Apres l'item "Preferences", avant le bloc admin
<Menu.Item component={Link} href="/polaires">
  Polaires
</Menu.Item>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/polaires/page.tsx src/components/MenuUtilisateur.tsx
git commit -m "feat(polaires): route /polaires + item menu utilisateur"
```

---

### Task 10 : CSS polaires dans globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ajouter les styles polaires**

Ajouter une section `/* === Editeur de polaires === */` dans globals.css. Porter les styles de `public/polaires/polaires.css` en prefixant les classes par `polaires-` pour eviter les collisions.

Sections a porter :
1. **Toolbar** (`.polaires-toolbar`) : fond accent bleu, texte blanc, flex row. Reutiliser les memes variables CSS que le standalone (`--accent`, `--bg`)
2. **Boutons** (`.polaires-btn--primary`, `--secondary`, `--small`, `--icon`) : reprendre les styles du standalone
3. **Select ref** (`.polaires-select-ref`) : style bouton dans la toolbar
4. **Avertissements** (`.polaires-avertissements`) : bandeau jaune
5. **Layout editeur** (`.polaires-editeur`) : flex row, chart sticky gauche, table scroll droite
6. **Tableau** (`.polaires-table`) : border-collapse, inputs dans les cellules, hover, dimmed, refs
7. **Modes ref** (`.polaires-ref-absolu`, `.polaires-ref-delta`) : affichage ref/delta sur les cellules
8. **Boutons supprimer** (`.polaires-btn--del`) : visibles au hover ligne/colonne
9. **Chart** (`.polaires-chart-container`) : position relative pour le tooltip
10. **Legende** (`.polaires-legende`) : flex wrap, checkboxes avec pastilles de couleur
11. **Tooltip** (`.polaires-tooltip`) : position absolute, fond sombre, texte blanc
12. **Toggle ref** (`.polaires-ref-toggle`) : boutons Absolu/Delta

Points d'attention :
- Les classes SVG (`.grid-circle`, `.polar-curve`, etc.) sont dans le SVG inline, pas besoin de prefixer
- Le tableau utilise des inputs au lieu de contenteditable : adapter les styles
- Garder les memes couleurs et espacements que le standalone
- Touch targets 44px pour les boutons d'action

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style(polaires): CSS editeur de polaires dans globals.css"
```

---

### Task 11 : Deplacer polarlib et nettoyer le standalone

**Files:**
- Move: `public/polaires/polarlib/` → `public/polarlib/`
- Delete: `public/polaires/` (index.html, polaires.js, polaires.css)

- [ ] **Step 1: Deplacer la bibliotheque de polaires**

```bash
git mv public/polaires/polarlib public/polarlib
```

- [ ] **Step 2: Supprimer le standalone**

```bash
git rm -r public/polaires/
```

- [ ] **Step 3: Mettre a jour les chemins dans BarreOutilsPolaires**

Le fetch de l'index JSON et des fichiers .pol doit pointer vers `/polarlib/` au lieu de `polarlib/` (chemin relatif).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(polaires): polarlib dans public/, suppression standalone"
```

---

### Task 12 : Verification et build

- [ ] **Step 1: Lancer le serveur dev**

Verifier que la page `/polaires` se charge sans erreur.

- [ ] **Step 2: Tester les fonctionnalites**

1. Le diagramme polaire s'affiche avec les courbes Sunlight 30
2. Le tableau est editable (modifier une cellule, voir le chart se mettre a jour)
3. Import d'un fichier .POL fonctionne
4. Export .POL telecharge un fichier valide
5. Le select de reference charge une polaire de la bibliotheque
6. Le mode delta affiche les differences colorees
7. Le zoom/pan fonctionne sur le diagramme
8. La legende toggle les courbes TWS
9. Le menu user affiche l'item "Polaires"
10. L'auth check redirige les non-connectes

- [ ] **Step 3: Build production**

```bash
npm run build
```

Verifier qu'il n'y a pas d'erreur TypeScript ni de build.

- [ ] **Step 4: Commit final + CHANGELOG**

Mettre a jour le CHANGELOG avec la nouvelle version.

```bash
git add CHANGELOG.md
git commit -m "docs: changelog integration polaires React"
```
