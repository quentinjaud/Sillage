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

- `bordTWA(twa: number): "B" | "T"` — badge babord/tribord

- `interpolerCirculaire(a: number, b: number, ratio: number): number` — interpolation par le chemin le plus court sur le cercle 360°. Utilisee pour le cap ET la direction vent.

### Interpolation du cap

Quand des points n'ont pas de `headingDeg`, on interpole entre les deux points encadrants qui en ont, via `interpolerCirculaire`.

### Correction interpolation vent

L'interpolation vent existante dans `interpolerVentSurPoints` utilise une interpolation lineaire pour `ventDirectionDeg`, ce qui produit des artefacts pres de 0°/360°. On remplace par `interpolerCirculaire` pour le champ direction.

## Icone TWA

Icone dediee inspiree de ChartedSails : un arc de cercle (rapporteur) avec une fleche bateau au centre. SVG inline dans le composant, `currentColor` pour la couleur.

## Pill TWA dans PanneauPointActif

### Condition d'affichage

La pill n'apparait que si `capDisponible && celluleActive != null`.

### Position

Apres la pill cap (derniere position parmi les pills actuelles).

### Contenu

- Icone TWA (SVG inline)
- Valeur absolue 0-180° + badge B/T
- Exemple : `[icone] 42° T`

### Comportement

- Cliquable : bascule `donneeGraphee` sur `"twa"`
- Active : style bleu accent (comme les autres pills donnees)
- Si `headingDeg` null sur le point actif : affiche `—` desactivee

### Props ajoutees a PanneauPointActif

- `celluleActive: CelluleMeteoClient | null` — deja calculee dans les deux vues parentes, on la passe directement plutot que les cellules brutes (evite de dupliquer la logique de lookup)

## Graphique TWA dans TraceChart

### Type

`DonneeGraphee` etendu avec `"twa"`.

### Architecture donnees

TWA est une valeur calculee, pas un champ de `PointCarte`. Il ne peut pas passer par `CONFIG_DONNEES` (qui mappe `cle: keyof PointCarte`). Il est traite comme un **mode special** au meme titre que `"vent"` et `"ventDirection"`, avec son propre memo de donnees calculees.

Pipeline :
1. Interpoler la direction vent sur les points GPS (via `interpolerVentSurPoints` corrige avec interpolation circulaire)
2. Pour chaque point, interpoler le cap si `headingDeg` null (via `interpolerCirculaire` entre encadrants)
3. Calculer `calculerTWA(cap, ventDirection)` → TWA signe [-180, +180]

### Affichage

- Axe Y : [-180, +180], zero au centre. Ticks : -180°, -90°, 0°, 90°, 180°
- Courbe coloree par vitesse bateau (`speedKn`) — meme degrade bleu→rouge que le graphique vitesse
- Slider thumb synchronise (pas de changement)

### Tooltip

Quand `donnee === "twa"` : affiche `TWA : 42° T` (valeur absolue + bord). Les autres lignes du tooltip (temps, vitesse/cap ou vent) restent affichees comme d'habitude.

### Fallback

Gere dans `TraceChart`, meme pattern que le fallback vent existant : si `donnee === "twa"` mais pas de cellules meteo ou pas de cap disponible, `donneeEffective` retombe sur `"vitesse"`.

### Points sans cap ni encadrants

Gaps dans la courbe (cas marginal, debut/fin de trace).

## Integration NavigationVueClient et TraceVueClient

Les deux vues suivent le meme pattern :

- Passer `celluleActive` (deja calcule) en prop supplementaire a `PanneauPointActif`
- `DonneeGraphee` accepte `"twa"` via extension du type
- TraceChart calcule le TWA en interne avec les fonctions pures de `twa.ts`

## Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `src/lib/types.ts` | Ajouter `"twa"` a `DonneeGraphee` |
| `src/lib/geo/twa.ts` | Nouveau — fonctions `calculerTWA`, `bordTWA`, `interpolerCirculaire` |
| `src/components/Stats/PanneauPointActif.tsx` | Nouvelle pill TWA, prop `celluleActive`, icone SVG |
| `src/components/Stats/TraceChart.tsx` | Mode special TWA (memo, interpolation cap, degrade vitesse, tooltip, fallback) + correction interpolation circulaire vent |
| `src/components/TraceVueClient.tsx` | Passer `celluleActive` a `PanneauPointActif` |
| `src/components/NavigationVueClient.tsx` | Idem |
| `src/app/globals.css` | Style pill TWA |
