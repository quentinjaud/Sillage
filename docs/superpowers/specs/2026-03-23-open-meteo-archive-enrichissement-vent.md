# Spec — Enrichissement vent Open-Meteo Archive

**Date** : 2026-03-23
**Phase** : 4 (Performance mono-trace) — brique fondatrice
**Statut** : Design valide

---

## Contexte

Sillage permet d'analyser des traces de navigation a voile. Les fichiers GPX importes contiennent position, vitesse et cap GPS, mais rarement les donnees de vent. Sans vent, impossible de calculer TWA, VMG, detecter les legs, ou analyser la performance.

Open-Meteo Archive fournit des donnees meteorologiques historiques gratuites (usage non-commercial) avec une resolution de ~25km spatiale et 1h temporelle. C'est une resolution grossiere comparee aux donnees GPS (seconde/metre), mais suffisante pour donner une tendance fiable sur une session de navigation.

## Decisions de design

| Decision | Choix | Raison |
|----------|-------|--------|
| Table de stockage | Separee (`CelluleMeteo`) | Resolution differente des TrackPoints — pas d'interpolation artificielle |
| Declencheur fetch | Bouton explicite (a la demande) | Evite les appels inutiles, choix conscient de l'utilisateur |
| Donnees fetchees | Vent uniquement (vitesse, rafales, direction) | Suffisant pour la voile, pas de surcharge |
| Post-fetch UX | Fetch silencieux (loader dans le bouton) | L'utilisateur a deja fait le choix, pas de friction |
| Donnee graphee vent | Courbe lissee | Coherence visuelle avec les autres courbes du graphique |
| Indicateur vent carte | Rose des vents HUD en bas a droite | Discret, coherent avec l'echelle nautique, interactif |
| Orientation carte | Dynamique (suit la cellule du curseur) | Plus immersif |

---

## 1. Modele de donnees

### Nouvelle table `CelluleMeteo`

```prisma
model CelluleMeteo {
  id               String   @id @default(cuid())
  traceId          String
  trace            Trace    @relation(fields: [traceId], references: [id])
  latitude         Float    // centre de la cellule Open-Meteo
  longitude        Float
  dateDebut        DateTime // debut de l'heure couverte
  dateFin          DateTime // fin de l'heure couverte
  ventVitesseKn    Float    // wind_speed_10m converti en kn
  ventRafalesKn    Float    // wind_gusts_10m converti en kn
  ventDirectionDeg Float    // wind_direction_10m (0-360, origine du vent)
  source           String   @default("open-meteo-archive")
  resolution       String   @default("25km/1h")

  @@unique([traceId, latitude, longitude, dateDebut])
  @@index([traceId])
}
```

Le modele `Trace` recoit la relation inverse : `cellulesMeteo CelluleMeteo[]`.

**Principes** :
- Une trace traversant plusieurs cellules spatiales ou temporelles → plusieurs lignes
- Les donnees sont stockees telles quelles, sans interpolation sur les TrackPoints
- Relation avec `Trace` (pas avec `Navigation`) — la nav pointe vers une trace, donc les donnees meteo sont partagees
- **Cascade delete** : oui — si la trace est supprimee, les cellules meteo le sont aussi (donnees re-fetchables, pas de valeur a conserver sans trace)
- Contrainte `@@unique` pour eviter les doublons en cas de double-clic

### Champs derives (calcules, pas stockes)

Les stats vent globales sont calculees a la volee a partir des CelluleMeteo :
- **Vent moyen** : moyenne ponderee par la duree de chaque cellule (en kn)
- **Rafales max** : max des `ventRafalesKn` sur toutes les cellules
- **Direction moyenne** : moyenne circulaire des angles
- **Variation direction** : ecart-type circulaire

---

## 2. API Open-Meteo

### Endpoint utilise

```
GET https://archive-api.open-meteo.com/v1/archive
  ?latitude=46.15,46.20
  &longitude=-1.15,-1.10
  &start_date=2025-07-15
  &end_date=2025-07-15
  &hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m
  &wind_speed_unit=kn
```

### Logique de fetch

1. Calculer la bounding box des points non-exclus de la trace
2. Determiner les centres de cellules Open-Meteo couvrant cette bbox (grille ~0.25°)
3. Calculer la plage temporelle (date debut → date fin des timestamps)
4. Appeler l'API Open-Meteo Archive (batch par 10 locations max par requete si trace etendue)
5. Stocker chaque combinaison (cellule spatiale × heure) en BDD

### Resolution de la cellule active

Quand le curseur pointe un timestamp donne, la cellule active est determinee par :
1. Filtrer les cellules couvrant ce timestamp (dateDebut ≤ t < dateFin)
2. Parmi celles-ci, prendre la cellule spatialement la plus proche du point GPS actif

Cela gere le cas ou la trace traverse plusieurs cellules spatiales dans la meme heure.

### Route API Next.js

```
POST /api/traces/[id]/meteo
```

- Verifie que la trace appartient a l'utilisateur
- Verifie qu'il n'y a pas deja de donnees meteo (idempotent)
- Appelle Open-Meteo, stocke les CelluleMeteo, retourne les stats calculees

```
DELETE /api/traces/[id]/meteo
```

- Supprime toutes les CelluleMeteo de la trace (permet un re-fetch apres nettoyage GPS)

### Gestion d'erreurs

- **Trace trop recente** (< 7 jours) : bouton grise avec tooltip "Donnees archives disponibles apres 7 jours"
- **Rate limit (429)** : message d'erreur temporaire dans le bouton, retry possible
- **Erreur reseau** : message "Echec du chargement", le bouton reste cliquable
- **Bbox trop grande** : pas de limite artificielle, mais batch des requetes par 10 locations

---

## 3. Chargement des donnees existantes

Quand l'utilisateur ouvre une trace/navigation deja enrichie :
- Le server component inclut les `CelluleMeteo` dans sa requete Prisma (`include: { cellulesMeteo: true }`)
- Les cellules sont serialisees en `CelluleMeteoClient[]` et passees au client
- Les stats vent sont calculees cote serveur et passees en props
- La rose des vents HUD et le mode d'orientation "vent archive" sont immediatement disponibles

---

## 4. UI — Bouton "Enrichir meteo"

### Emplacement

En bas du `PanneauStats`, sous les stats existantes (distance, duree, vitesse).

### Etats

1. **Pas de donnees meteo** : bouton "Enrichir meteo" visible (icone vent + texte)
2. **Trace trop recente** : bouton grise avec tooltip "Disponible apres 7 jours"
3. **Pas de timestamps** : bouton grise avec tooltip "Timestamps requis"
4. **Chargement** : loader dans le bouton, texte "Chargement meteo..."
5. **Erreur** : message d'erreur temporaire, bouton reste cliquable
6. **Donnees presentes** : le bouton disparait, remplace par les stats vent + lien discret "Supprimer meteo" pour re-fetch

### Stats vent affichees

```
Distance : 12.3 NM
Duree    : 2h45
V. moy.  : 5.2 kn
V. max   : 8.1 kn
─────────────────────
Vent moy.  : 12 kn
Rafales    : 18 kn
Direction  : 240° (WSW)
Var. dir.  : ±15°
```

Label discret sous les stats vent : "Open-Meteo archive · 25km/1h"

### Disponibilite

- **TraceVue** : bouton present si la trace a des timestamps
- **NavVue** : idem (la nav pointe vers une trace)
- Grise si la trace n'a pas de timestamps (impossible de requeter l'historique meteo)

---

## 5. UI — Rose des vents HUD

### Emplacement

En bas a droite de la carte, symetrique a l'echelle nautique (bas gauche). Meme style : fond semi-transparent, typo coherente.

### Contenu

- Rose des vents compacte avec indicateur de direction du vent (secteur colore ou fleche)
- Vitesse du vent en kn affichee a cote
- S'adapte a la cellule du curseur actif (meme timestamp que le point actif)

### Interaction

- **Clic** : toggle le graphique en mode "vent" (`DonneeGraphee = "vent"`). Un second clic revient a la donnee precedente (vitesse ou cap). Les pills vitesse/cap du panneau point actif permettent aussi de quitter le mode vent.
- **Absent/masque** si pas de donnees meteo fetchees

### Orientation carte

La rose des vents reflete toujours l'orientation reelle — en mode "vent en haut", le nord tourne dans la rose.

---

## 6. Orientation carte — selecteur boussole

### Modes d'orientation

Le bouton boussole existant dans les controles carte devient un selecteur. Au clic, un popover affiche les modes disponibles :

| Mode | Source | Disponible quand | Comportement |
|------|--------|-------------------|-------------|
| **Nord** | fixe | toujours (defaut) | Carte orientee nord en haut |
| **Vent archive** | Open-Meteo | donnees meteo fetchees | Carte tourne pour mettre l'origine du vent en haut, dynamique par cellule du curseur |
| **Vent bords** | deduit des legs | mode perf + detection legs (futur) | — |
| **Vent choisi** | angle manuel | mode perf (futur) | — |
| **Vent NMEA** | instruments GPX | donnees TWD dans la trace (futur) | — |

- Popover plutot que cycle (evite de traverser des modes grises)
- Les modes indisponibles sont grises avec un tooltip explicatif
- En mode "vent archive", quand le curseur passe d'une cellule a une autre avec une direction differente, la carte tourne en smooth (`map.rotateTo()` de MapLibre, transition animee)

### Hierarchie de fiabilite

NMEA > vent bords > archive > choisi. Les modes futurs debloquent progressivement.

---

## 7. Donnee graphee "vent" dans TraceChart

### Ajout au systeme existant

- Nouveau type dans `DonneeGraphee` : `"vent"`
- Nouvelle entree dans `CONFIG_DONNEES` :
  ```
  vent: { cle: "ventVitesseKn", titre: "Vent (kn)", unite: "kn", ... }
  ```
- Le switch ne se fait PAS via les pills du panneau point actif, mais via **clic sur la rose des vents HUD**

### Affichage

- Courbe lissee monotone (`type="monotone"` Recharts — interpolation Catmull-Rom)
- Couleur distincte : bleu Sillage `#43728B` (pas de gradient vitesse, c'est une donnee differente)
- Les donnees sous-jacentes sont les CelluleMeteo, pas les TrackPoints — il faudra projeter les valeurs horaires sur l'axe temporel du graphique

### Donnees du graphique

Le graphique vent utilise les CelluleMeteo projetees sur l'axe temps :
- Pour chaque CelluleMeteo, un point au centre de son intervalle temporel
- Interpolation lineaire entre les points pour la courbe lissee
- Le sous-echantillonnage (`sousechantillonner`) ne s'applique pas (peu de points, resolution horaire)

---

## 8. Types TypeScript

### Nouveau type `CelluleMeteoClient`

```typescript
interface CelluleMeteoClient {
  latitude: number;
  longitude: number;
  dateDebut: string;  // ISO
  dateFin: string;    // ISO
  ventVitesseKn: number;
  ventRafalesKn: number;
  ventDirectionDeg: number;
}
```

### Extension de `DonneeGraphee`

```typescript
type DonneeGraphee = "vitesse" | "cap" | "vent";
```

### Stats vent

```typescript
interface StatsVent {
  ventMoyenKn: number;
  rafalesMaxKn: number;
  directionMoyenneDeg: number;
  variationDirectionDeg: number;
  source: string;
  resolution: string;
}
```

---

## 9. Perimetre par vue

| Fonctionnalite | TraceVue | NavVue | PerfVue (futur) |
|----------------|----------|--------|-----------------|
| Bouton enrichir meteo | oui | oui | oui |
| Stats vent PanneauStats | oui | oui | oui |
| Rose des vents HUD | oui | oui | oui |
| Donnee graphee vent | oui | oui | oui |
| Orientation carte vent archive | oui | oui | oui |
| Orientations vent bords/choisi/NMEA | — | — | futur |
| Calcul TWA/VMG | — | — | futur |

---

## 10. Contraintes et limites

- **Open-Meteo gratuit pour usage non-commercial uniquement** — surveiller si Sillage evolue vers un modele commercial
- **Resolution 25km/1h** — inadapte pour la regate cotiere (variations locales), utile pour la croisiere et la tendance generale
- **Timestamps requis** — les traces sans timestamps ne peuvent pas etre enrichies (bouton grise)
- **Delai archive ~7 jours** — les traces tres recentes ne peuvent pas etre enrichies (bouton grise avec tooltip)
- **Pas d'interpolation sur les TrackPoints** — les donnees meteo restent a leur resolution native, projetees sur l'axe temps du graphique mais jamais associees point par point
- **Idempotent** — si les donnees existent deja, le bouton disparait (lien "Supprimer meteo" pour re-fetch)
- **Convention direction** — `ventDirectionDeg` = origine du vent (convention meteo). "Vent en haut" = la carte tourne pour que l'origine du vent pointe vers le haut du viewport (le vent souffle du haut vers le bas)

---

## 11. Hors perimetre (futur)

- Import de donnees vent depuis extensions GPX (NMEA) — Phase 4 priorite 1
- Calcul TWA et VMG — Phase 4
- Detection de legs (upwind/downwind/reaching) — Phase 4
- Modes d'orientation vent bords / vent choisi / vent NMEA — Phase 4+
- Affichage de particules vent type Windy — exclu
- Temperature, pluie, pression — exclu (vent uniquement)
