# TWA — Calcul et affichage

## Contexte

On dispose du cap GPS bateau (`headingDeg` par point) et du vent theorique Open-Meteo (`ventDirectionDeg` par cellule interpolee). On peut donc calculer le TWA (True Wind Angle) et l'afficher dans les pills et le graphique.

## Calcul

### Fichier : `src/lib/geo/twa.ts`

Fonctions pures, pas de state :

- `calculerTWA(capDeg: number, ventDirectionDeg: number): number`
  - Formule : `((ventDirectionDeg - capDeg + 540) % 360) - 180`
  - Resultat dans [-180, +180]
  - Negatif = babord, positif = tribord
  - 0° = face au vent, ±180° = vent arriere

- `twaAbsolu(twa: number): number` — `Math.abs(twa)`, pour affichage pill (0-180)

- `bordTWA(twa: number): "B" | "T"` — badge babord/tribord

### Interpolation du cap

Quand des points n'ont pas de `headingDeg`, on interpole lineairement entre les deux points encadrants qui en ont. Interpolation circulaire (chemin le plus court sur 360°) pour eviter les artefacts aux passages 350°→10°.

## Pill TWA dans PanneauPointActif

### Condition d'affichage

La pill n'apparait que si `capDisponible && cellulesMeteo.length > 0`.

### Position

Apres la pill cap, avant les eventuelles pills vent.

### Contenu

- Icone composee : `Navigation` (bateau) + `Wind` assemblees dans un conteneur inline
- Valeur absolue 0-180° + badge B/T
- Exemple : `[icone] 42° T`

### Comportement

- Cliquable : bascule `donneeGraphee` sur `"twa"`
- Active : style bleu accent (comme les autres pills donnees)
- Si `headingDeg` null sur le point actif : affiche `—` desactivee

### Props ajoutees a PanneauPointActif

- `cellulesMeteo: CelluleMeteoClient[]` (deja disponible dans les vues parentes)

## Graphique TWA dans TraceChart

### Type

`DonneeGraphee` etendu avec `"twa"`.

### Serie de donnees

Pour chaque point GPS :
1. Interpoler le vent (direction) via le pattern existant `interpolerVentSurPoints`
2. Interpoler le cap si `headingDeg` null (interpolation circulaire entre encadrants)
3. Calculer `calculerTWA(cap, ventDirection)` → TWA signe

### Config

```
twa: {
  titre: "TWA",
  unite: "°",
  domaine: [-180, 180],
}
```

### Affichage

- Axe Y : [-180, +180], zero au centre. Ticks : -180°, -90°, 0°, 90°, 180°
- Courbe coloree par vitesse bateau (`speedKn`) — meme degrade bleu→rouge que le graphique vitesse
- Slider thumb synchronise (pas de changement)

### Tooltip

Valeur absolue + bord : `TWA : 42° T` ou `TWA : 127° B`

### Points sans cap ni encadrants

Gaps dans la courbe (cas marginal, debut/fin de trace).

## Integration NavigationVueClient et TraceVueClient

Les deux vues suivent le meme pattern :

- Passer `cellulesMeteo` en prop supplementaire a `PanneauPointActif`
- `DonneeGraphee` accepte `"twa"` via extension du type
- TraceChart calcule le TWA en interne avec les fonctions pures de `twa.ts`
- Si `"twa"` est selectionne mais cap ou vent disparait → fallback sur `"vitesse"`

## Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `src/lib/types.ts` | Ajouter `"twa"` a `DonneeGraphee` |
| `src/lib/geo/twa.ts` | Nouveau — fonctions `calculerTWA`, `twaAbsolu`, `bordTWA` |
| `src/components/Stats/PanneauPointActif.tsx` | Nouvelle pill TWA, prop `cellulesMeteo` |
| `src/components/Stats/TraceChart.tsx` | Serie TWA, interpolation cap, degrade vitesse |
| `src/components/TraceVueClient.tsx` | Passer `cellulesMeteo` a `PanneauPointActif` |
| `src/components/NavigationVueClient.tsx` | Idem |
| `src/app/globals.css` | Style icone composee TWA |
