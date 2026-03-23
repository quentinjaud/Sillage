# TWA — Calcul et affichage — Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculer et afficher le TWA (True Wind Angle) dans les pills et le graphique des vues trace et navigation.

**Architecture:** Fonctions pures de calcul dans `src/lib/geo/twa.ts`. TWA traite comme mode special dans TraceChart (comme vent/ventDirection). Pill TWA dans PanneauPointActif conditionnee a la dispo cap + vent.

**Tech Stack:** React 19, Recharts, Lucide icons, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-23-twa-calcul-affichage.md`

---

## Structure des fichiers

| Fichier | Action | Responsabilite |
|---------|--------|---------------|
| `src/lib/geo/twa.ts` | Creer | Fonctions pures : `calculerTWA`, `bordTWA`, `interpolerCirculaire` |
| `src/lib/types.ts` | Modifier (ligne 140) | Ajouter `"twa"` a `DonneeGraphee` |
| `src/components/Stats/PanneauPointActif.tsx` | Modifier | Pill TWA, nouvelle prop `celluleActive` |
| `src/components/Stats/TraceChart.tsx` | Modifier | Mode special TWA, correction interpolation circulaire vent, tooltip TWA |
| `src/components/TraceVueClient.tsx` | Modifier | Passer `celluleActive` a `PanneauPointActif` |
| `src/components/NavigationVueClient.tsx` | Modifier | Idem |

---

### Task 1 : Fonctions pures TWA

**Files:**
- Create: `src/lib/geo/twa.ts`

- [ ] **Step 1: Creer `src/lib/geo/twa.ts` avec les 3 fonctions**

```typescript
/**
 * Interpolation circulaire entre deux angles (chemin le plus court sur 360°).
 * ratio = 0 → a, ratio = 1 → b.
 */
export function interpolerCirculaire(a: number, b: number, ratio: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  const result = a + diff * ratio;
  return ((result % 360) + 360) % 360;
}

/**
 * Calcule le TWA signe.
 * ventDirectionDeg = direction d'ou vient le vent (convention meteo Open-Meteo).
 * Resultat dans [-180, +180]. Negatif = babord, positif = tribord.
 * 0° = face au vent, ±180° = vent arriere.
 */
export function calculerTWA(capDeg: number, ventDirectionDeg: number): number {
  return ((ventDirectionDeg - capDeg + 540) % 360) - 180;
}

/** Badge babord/tribord. */
export function bordTWA(twa: number): "B" | "T" {
  return twa < 0 ? "B" : "T";
}
```

- [ ] **Step 2: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/geo/twa.ts
git commit -m "feat(twa): fonctions pures calculerTWA, bordTWA, interpolerCirculaire"
```

---

### Task 2 : Etendre le type DonneeGraphee + mise a jour TraceChart

**Files:**
- Modify: `src/lib/types.ts:140`
- Modify: `src/components/Stats/TraceChart.tsx:36-37,99-100`

- [ ] **Step 1: Ajouter `"twa"` au type**

Dans `src/lib/types.ts`, ligne 140, remplacer :
```typescript
export type DonneeGraphee = "vitesse" | "cap" | "vent" | "ventDirection";
```
Par :
```typescript
export type DonneeGraphee = "vitesse" | "cap" | "vent" | "ventDirection" | "twa";
```

- [ ] **Step 2: Mettre a jour `CONFIG_DONNEES` Record type dans TraceChart**

Dans `src/components/Stats/TraceChart.tsx`, ligne ~36-37, remplacer :
```typescript
const CONFIG_DONNEES: Record<
  Exclude<DonneeGraphee, "vent" | "ventDirection">,
```
Par :
```typescript
const CONFIG_DONNEES: Record<
  Exclude<DonneeGraphee, "vent" | "ventDirection" | "twa">,
```

- [ ] **Step 3: Mettre a jour le fallback `donneeEffective`**

Dans le meme fichier, ligne ~99-100, remplacer :
```typescript
const donneeEffective: Exclude<DonneeGraphee, "vent" | "ventDirection"> =
  (donnee === "vent" || donnee === "ventDirection") ? "vitesse" : donnee;
```
Par :
```typescript
const donneeEffective: Exclude<DonneeGraphee, "vent" | "ventDirection" | "twa"> =
  (donnee === "vent" || donnee === "ventDirection" || donnee === "twa") ? "vitesse" : donnee;
```

- [ ] **Step 4: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/components/Stats/TraceChart.tsx
git commit -m "feat(twa): ajouter twa a DonneeGraphee + fallback TraceChart"
```

---

### Task 3 : Corriger l'interpolation vent (circulaire pour direction)

**Files:**
- Modify: `src/components/Stats/TraceChart.tsx:130-181` (interpolerVentSurPoints)

- [ ] **Step 1: Importer `interpolerCirculaire` dans TraceChart**

Ajouter en haut du fichier :
```typescript
import { interpolerCirculaire } from "@/lib/geo/twa";
```

- [ ] **Step 2: Modifier `interpolerVentSurPoints` pour utiliser l'interpolation circulaire sur la direction**

Dans la fonction `interpolerVentSurPoints`, remplacer le bloc d'interpolation lineaire (~ligne 174) :
```typescript
          const ratio = (t - a.temps) / (b.temps - a.temps);
          const valeur = a.valeur + ratio * (b.valeur - a.valeur);
```
Par :
```typescript
          const ratio = (t - a.temps) / (b.temps - a.temps);
          const valeur = champ === "ventDirectionDeg"
            ? interpolerCirculaire(a.valeur, b.valeur, ratio)
            : a.valeur + ratio * (b.valeur - a.valeur);
```

- [ ] **Step 3: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/Stats/TraceChart.tsx
git commit -m "fix: interpolation circulaire pour direction vent dans TraceChart"
```

---

### Task 4 : Pill TWA dans PanneauPointActif

**Files:**
- Modify: `src/components/Stats/PanneauPointActif.tsx`

- [ ] **Step 1: Ajouter l'import `CelluleMeteoClient` et les fonctions TWA**

Dans `PanneauPointActif.tsx`, modifier l'import existant de types (ligne 6) :
```typescript
import type { PointCarte, DonneeGraphee, CelluleMeteoClient } from "@/lib/types";
```

Ajouter l'import des fonctions TWA :
```typescript
import { calculerTWA, bordTWA } from "@/lib/geo/twa";
```

- [ ] **Step 2: Ajouter la prop `celluleActive` a l'interface**

Dans l'interface `PropsPanneauPointActif`, ajouter :
```typescript
  celluleActive: CelluleMeteoClient | null;
```

Et la destructurer dans le composant.

- [ ] **Step 3: Ajouter la pill TWA apres le bouton cap**

Apres le bouton cap (dernier bouton actuel), ajouter :

```tsx
{/* TWA — visible seulement si cap + vent dispo */}
{capDisponible && celluleActive && (
  <button
    className={`point-actif-pill point-actif-pill-donnee ${donneeGraphee === "twa" ? "point-actif-pill-active" : ""}`}
    onClick={() => onChangeDonneeGraphee("twa")}
    disabled={donneeGraphee === "twa"}
  >
    <svg className="point-actif-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <mask id="twa-a" maskUnits="userSpaceOnUse" x="0" y="7" width="24" height="14" fill="#000"><path fill="#fff" d="M0 7h24v14H0z"/><path d="M21 19c.552 0 1.005-.449.95-.998a10 10 0 0 0-19.9 0c-.055.55.398.998.95.998.552 0 .994-.45 1.062-.997a8 8 0 0 1 15.876 0c.069.547.51.997 1.062.997Z"/></mask>
      <mask id="twa-b"><path fill="#fff" d="M0 0h24v24H0z"/><path d="M11.62 16.557 6.566 10.66A.4.4 0 0 1 6.87 10h10.26a.4.4 0 0 1 .304.66l-5.054 5.897a.5.5 0 0 1-.76 0Z" fill="#000"/><path d="M21 19c.552 0 1.005-.449.95-.998a10 10 0 0 0-19.9 0c-.055.55.398.998.95.998.552 0 .994-.45 1.062-.997a8 8 0 0 1 15.876 0c.069.547.51.997 1.062.997Z" stroke="#000" strokeWidth="4" mask="url(#twa-a)"/></mask>
      <g mask="url(#twa-b)"><path fillRule="evenodd" clipRule="evenodd" d="M11.49 1.809a.5.5 0 0 1 .879-.008l1.517 2.726a19.999 19.999 0 0 1 2.358 7.151l.295 2.278c.305 2.346.19 4.729-.337 7.035l-.098.43a2 2 0 0 1-1.941 1.553l-4.31.019a2 2 0 0 1-1.959-1.556l-.104-.458a20 20 0 0 1-.331-7.01l.32-2.469a20 20 0 0 1 2.193-6.847L11.49 1.81Z" fill="currentColor"/></g>
      <path d="M21 19c.552 0 1.005-.449.95-.998a10 10 0 0 0-19.9 0c-.055.55.398.998.95.998.552 0 .994-.45 1.062-.997a8 8 0 0 1 15.876 0c.069.547.51.997 1.062.997Z" fill="currentColor"/>
      <path d="m11.52 13.36-2.04-2.72A.4.4 0 0 1 9.8 10h4.4a.4.4 0 0 1 .32.64l-2.04 2.72a.6.6 0 0 1-.96 0Z" fill="currentColor"/>
    </svg>
    {(() => {
      if (pointActif.headingDeg == null) return "—";
      const twa = calculerTWA(pointActif.headingDeg, celluleActive.ventDirectionDeg);
      return `${Math.abs(Math.round(twa))}° ${bordTWA(twa)}`;
    })()}
  </button>
)}
```

- [ ] **Step 4: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/components/Stats/PanneauPointActif.tsx
git commit -m "feat(twa): pill TWA dans PanneauPointActif avec icone ChartedSails"
```

---

### Task 5 : Passer `celluleActive` aux vues parentes

**Files:**
- Modify: `src/components/TraceVueClient.tsx:~125`
- Modify: `src/components/NavigationVueClient.tsx:~253`

- [ ] **Step 1: Modifier TraceVueClient — ajouter prop `celluleActive`**

Dans le JSX de `PanneauPointActif` (~ligne 125), ajouter la prop :
```tsx
<PanneauPointActif
  pointActif={pointActif}
  donneeGraphee={donneeGraphee}
  onChangeDonneeGraphee={setDonneeGraphee}
  capDisponible={capDisponible}
  celluleActive={celluleActive}
/>
```

`celluleActive` est deja calcule dans le composant (ligne ~83).

- [ ] **Step 2: Modifier NavigationVueClient — idem**

Dans le JSX de `PanneauPointActif` (~ligne 253), meme ajout :
```tsx
  celluleActive={celluleActive}
```

`celluleActive` est deja calcule dans le composant (ligne ~159).

- [ ] **Step 3: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/TraceVueClient.tsx src/components/NavigationVueClient.tsx
git commit -m "feat(twa): passer celluleActive a PanneauPointActif dans les deux vues"
```

---

### Task 6 : Serie TWA dans TraceChart — donnees + courbe

**Files:**
- Modify: `src/components/Stats/TraceChart.tsx`

C'est la task la plus dense. TWA est un mode special comme vent/ventDirection.

- [ ] **Step 1: Completer les imports TWA**

Verifier/modifier l'import (ajoute en task 3) pour inclure toutes les fonctions :
```typescript
import { interpolerCirculaire, calculerTWA, bordTWA } from "@/lib/geo/twa";
```

- [ ] **Step 2: Ajouter le boolean `modeTWA`**

Apres les booleans existants `modeVent`/`modeVentDirection` (~ligne 95-98), ajouter :
```typescript
const modeTWA = donnee === "twa";
```

- [ ] **Step 3: Ajouter la fonction d'interpolation du cap**

Apres `interpolerVentSurPoints`, ajouter :

```typescript
/** Interpole le cap sur les points qui n'en ont pas, via interpolation circulaire. */
const interpolerCapSurPoints = useCallback((): (number | null)[] => {
  const caps = points.map((p) => p.headingDeg);
  for (let i = 0; i < caps.length; i++) {
    if (caps[i] != null) continue;
    let gauche = i - 1;
    while (gauche >= 0 && caps[gauche] == null) gauche--;
    let droite = i + 1;
    while (droite < caps.length && caps[droite] == null) droite++;
    if (gauche < 0 || droite >= caps.length) continue;
    const ratio = (i - gauche) / (droite - gauche);
    caps[i] = interpolerCirculaire(caps[gauche]!, caps[droite]!, ratio);
  }
  return caps;
}, [points]);
```

- [ ] **Step 4: Ajouter le memo `donneesTWA`**

Apres `donneesVentDir` (ou apres les memos vent existants), ajouter :

```typescript
const donneesTWA = useMemo(() => {
  if (!modeTWA || !cellulesMeteo?.length) return [];
  const ventDirs = interpolerVentSurPoints("ventDirectionDeg");
  if (!ventDirs.length) return [];
  const caps = interpolerCapSurPoints();
  const ventParIndex = new Map(ventDirs.map((v) => [v.pointIndex, v.valeur]));

  return sousechantillonner(
    points
      .filter((p) => p.timestamp != null)
      .map((p, i) => {
        const idx = p.pointIndex ?? i;
        const cap = caps[i];
        const ventDir = ventParIndex.get(idx);
        if (cap == null || ventDir == null) return null;
        return {
          temps: new Date(p.timestamp!).getTime(),
          heure: p.timestamp!,
          valeur: calculerTWA(cap, ventDir),
          pointIndex: idx,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d != null),
    500
  );
}, [modeTWA, cellulesMeteo, points, interpolerVentSurPoints, interpolerCapSurPoints]);
```

- [ ] **Step 5: Brancher `donneesTWA` dans `donneesActives`**

Ligne ~223, remplacer :
```typescript
const donneesActives = modeVentDirection ? donneesVentDir : modeVent ? donneesVent : donneesGraphique;
```
Par :
```typescript
const donneesActives = modeTWA ? donneesTWA : modeVentDirection ? donneesVentDir : modeVent ? donneesVent : donneesGraphique;
```

- [ ] **Step 6: Ajouter `donneesTWA` au useEffect des dependances slider**

Ligne ~220, ajouter `donneesTWA` au tableau de dependances :
```typescript
}, [donneesGraphique, donneesVent, donneesVentDir, donneesTWA]);
```

- [ ] **Step 7: Titre et formateur pour le mode TWA**

Lignes ~432-435, remplacer :
```typescript
const configVentActif = modeVentDirection ? CONFIG_VENT_DIR : CONFIG_VENT;
const titreActif = modeVent ? configVentActif.titre : config.titre;
const formaterActif = modeVent ? configVentActif.formater : config.formater;
```
Par :
```typescript
const configVentActif = modeVentDirection ? CONFIG_VENT_DIR : CONFIG_VENT;
const titreActif = modeTWA ? "TWA" : modeVent ? configVentActif.titre : config.titre;
const formaterActif = modeTWA ? ((v: number) => `${Math.round(v)}°`) : modeVent ? configVentActif.formater : config.formater;
```

- [ ] **Step 8: Axe Y pour TWA**

Ligne ~464, remplacer :
```typescript
domain={modeVent ? (modeVentDirection ? CONFIG_VENT_DIR.domaine : undefined) : config.domaine}
```
Par :
```typescript
domain={modeTWA ? [-180, 180] : modeVent ? (modeVentDirection ? CONFIG_VENT_DIR.domaine : undefined) : config.domaine}
ticks={modeTWA ? [-180, -90, 0, 90, 180] : undefined}
```

- [ ] **Step 9: Gradient — activer pour TWA**

Ligne ~467, le gradient est rendu quand `!modeVent`. Comme `modeTWA` n'est pas `modeVent`, le gradient existant (base sur `donneesVitesse`) s'applique automatiquement. Les offsets positionnels sont alignes car `donneesVitesse` et `donneesTWA` sont sous-echantillonnes a 500 points depuis les memes `points` source.

Rien a changer ici — verifier simplement que ca fonctionne visuellement.

- [ ] **Step 10: Stroke de la courbe — activer gradient pour TWA**

Ligne ~483, verifier que la condition existante couvre TWA :
```typescript
stroke={modeVent ? "#43728B" : `url(#${strokeId})`}
```

`modeTWA` n'est pas `modeVent`, donc le gradient s'applique. OK tel quel.

- [ ] **Step 11: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 12: Commit**

```bash
git add src/components/Stats/TraceChart.tsx
git commit -m "feat(twa): serie TWA dans TraceChart — donnees interpolees + courbe coloree vitesse"
```

---

### Task 7 : Tooltip TWA dans TraceChart

**Files:**
- Modify: `src/components/Stats/TraceChart.tsx:242-261,520-553`

- [ ] **Step 1: Ajouter le champ `twa` a l'objet `tooltipActif`**

Dans le memo `tooltipActif` (~ligne 242-261), apres le calcul des donnees vent (ligne ~258), ajouter le calcul TWA :

```typescript
    // Donnees TWA
    const twa = (cap != null && cellule)
      ? calculerTWA(cap, cellule.ventDirectionDeg)
      : null;

    return { pct, heure, vitesse, cap, force: cellule ? Math.round(cellule.ventVitesseKn) : null, dir: cellule ? Math.round(cellule.ventDirectionDeg) : null, twa };
```

- [ ] **Step 2: Etendre le rendu du tooltip pour le mode TWA**

Dans la section tooltip (~ligne 530), ajouter le cas `modeTWA` AVANT le cas `modeVent` :

```tsx
{modeTWA ? (
  <>
    <span className="chart-tooltip-val">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 19c.552 0 1.005-.449.95-.998a10 10 0 0 0-19.9 0c-.055.55.398.998.95.998.552 0 .994-.45 1.062-.997a8 8 0 0 1 15.876 0c.069.547.51.997 1.062.997Z"/>
      </svg>
      {" "}{tooltipActif.twa != null ? `${Math.abs(Math.round(tooltipActif.twa))}° ${bordTWA(tooltipActif.twa)}` : "—"}
    </span>
    <span className="chart-tooltip-val"><Gauge size={11} /> {tooltipActif.vitesse != null ? `${tooltipActif.vitesse.toFixed(1)} kn` : "—"}</span>
  </>
) : modeVent ? (
```

Le reste du tooltip existant (cas modeVent et cas defaut) reste inchange.

- [ ] **Step 3: Verifier que le build passe**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/Stats/TraceChart.tsx
git commit -m "feat(twa): tooltip TWA dans TraceChart — valeur absolue + bord + vitesse"
```

---

### Task 8 : Test visuel et push

- [ ] **Step 1: Lancer le dev server et tester**

Run: `npm run dev`

Verifier sur une navigation avec cap + vent :
1. La pill TWA apparait apres le cap
2. Cliquer la pill bascule le graphique en mode TWA
3. Le graphique affiche [-180, +180] avec zero au centre, ticks a -180, -90, 0, 90, 180
4. La courbe est coloree par vitesse (degrade bleu→rouge)
5. Le tooltip affiche la valeur TWA absolue + bord (ex: `42° T`)
6. Le titre du graphique affiche "TWA"
7. Sans vent charge, la pill TWA n'apparait pas
8. L'icone TWA ChartedSails est visible et lisible a 14px

- [ ] **Step 2: Verifier le build complet**

Run: `npm run build`

- [ ] **Step 3: Commit final si ajustements + push**

```bash
git push
```
