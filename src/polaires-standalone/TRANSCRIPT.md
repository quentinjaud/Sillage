# Transcript - Editeur de Polaires Navimetrix

**Date :** 25 mars 2026
**Origine :** Repo Origami-voilier (`frontend/public/polaires/`)
**Destination :** Repo Sillage (`src/polaires-standalone/`)
**Objectif :** Integrer dans l'app Next.js Sillage

---

## Ce qui existe

3 fichiers standalone vanilla (HTML/JS/CSS) + une bibliotheque de ~495 polaires `.pol`.

```
polaires-standalone/
  index.html          # Page HTML standalone
  polaires.css        # Styles complets
  polaires.js         # Toute la logique (~800 lignes)
  polarlib/           # ~495 fichiers .pol Navimetrix
    index.json        # Index JSON des noms de polaires
    sunlight30.pol
    django980.pol
    first30.pol
    ...
```

## Format .POL Navimetrix

```
TWA\TWS	0	6	8	10	12	14	16	20	40
0	0.0	0.0	0.0	0.0	0.0	0.0	0.0	0.0	0.0
52	0.0	4.69	5.74	6.58	7.07	7.37	7.59	7.76	7.90
...
```

- Separateur : tabulation
- Header : `TWA\TWS` puis valeurs TWS (noeuds)
- Colonne 1 : valeurs TWA (degres, 0-180)
- Corps : vitesses bateau (noeuds, 1 decimale)
- Recos Navimetrix : TWS commence a 0, TWS max >= 40, TWA commence a 0

---

## Fonctionnalites implementees

### 1. Modele de donnees

```js
const state = {
  tws: [],              // valeurs TWS
  twa: [],              // valeurs TWA
  speeds: [],           // speeds[twaIdx][twsIdx]
  name: 'Sunlight 30',  // nom polaire courante
  dirty: false,         // modifie depuis dernier import/export
  visibleTWS: new Set(),// indices TWS visibles sur le chart
  showApparent: false,  // afficher courbes vent apparent
  ref: null,            // polaire de reference { tws, twa, speeds, name }
  refMode: 'absolu'     // 'absolu' ou 'delta' pour affichage tableau
};
```

### 2. Tableau editable

- HTML `<table>` avec cellules `contenteditable`
- TWS=0 et TWA=0 masques visuellement (conserves dans le modele pour export)
- Validation sur blur/Enter : nombre >= 0, sinon revert + flash rouge
- Boutons `+` pour ajouter ligne TWA / colonne TWS (prompt valeur)
- Boutons `x` au hover pour supprimer ligne/colonne
- Re-tri automatique apres ajout

### 3. Diagramme polaire SVG

- ViewBox centree, TWA comme angle depuis le haut (0 degres = vent debout)
- Cercles concentriques pour l'echelle de vitesse (auto-scaled sur courbes VISIBLES)
- Lignes radiales tous les 30 degres avec labels
- Une polyligne Catmull-Rom par TWS, couleur distincte (palette de 15 couleurs)
- Semi-circulaire (tribord seulement, 0-180 degres)
- Coordonnees : `x = speed * sin(TWA)`, `y = -speed * cos(TWA)`

### 4. Vent apparent (AWA/AWS)

Calcule cote client pour chaque point (TWA, TWS, Bs) :
```
AWS = sqrt((TWS*sin(TWA))^2 + (TWS*cos(TWA) + Bs)^2)
AWA = atan2(TWS*sin(TWA), TWS*cos(TWA) + Bs)
```

- Courbes apparent en dotted (vrais points ronds via `stroke-dasharray: 0.1 3` + `stroke-linecap: round`)
- Meme couleur que les courbes true wind
- Toggle "Apparent" dans la legende avec indicateur SVG inline dotted
- Filtrees par les memes checkboxes TWS

### 5. Tooltip snap

- `mousemove` sur tout le SVG, trouve le point de donnees le plus proche (distance euclidienne en coordonnees SVG)
- Rayon max de snap ~30 unites SVG
- Point actif mis en surbrillance (classe `.active`)
- Affiche toujours TWA/TWS/Bs + AWA/AWS
- Si ref chargee, ajoute une 3e ligne "Ref: X.X kn (delta)"

### 6. Zoom / Pan

- Manipulation directe du `viewBox` SVG
- Molette : zoom vers le curseur (clamp min/max)
- Clic gauche + drag : pan
- Double-clic : reset vue par defaut
- Curseur `grab` / `grabbing`

### 7. Import / Export .POL

- `parsePOLData(text)` : fonction pure retournant `{ tws, twa, speeds }`
- `parsePOL(text)` : appelle parsePOLData et assigne a state
- Export : Blob + URL.createObjectURL + `<a download>`
- Avertissements Navimetrix avant export (TWS commence pas a 0, TWS max < 40, TWA commence pas a 0)
- Garde `beforeunload` si donnees modifiees

### 8. Mode comparaison (en cours)

**Etat actuel :** fonctionnel avec select deroulant (derniere modif, pas encore testee a 100%)

- Select deroulant dans la toolbar chargeant depuis `polarlib/index.json`
- Option "Importer une ref..." pour fichier custom
- Polaire de reference en overlay gris semi-transparent (`rgba(0,0,0,0.2)`, stroke-width: 1)
- Courbes ref filtrees par les memes checkboxes TWS que la polaire principale
- Courbes apparent de la ref aussi calculees et affichees (gris + dotted)
- Echelle diagramme calculee sur les TWS visibles des DEUX polaires
- Interpolation bilineaire pour les valeurs ref manquantes (TWA/TWS non exactement matches)
- Tableau : valeurs ref affichees sous chaque cellule via CSS `::after` sur `data-ref`
- Toggle "Absolu / +/-Delta" sous le tableau pour basculer le mode d'affichage
  - Absolu : valeur ref en petit gris
  - Delta : fleches colorees (vert = plus rapide, rouge = plus lent)
- Les `data-*` attributs survivent a l'edition des cellules (contrairement au innerHTML)
- Tooltip : ligne ref avec delta colore
- Legende : "Ref : NomPolaire" en bas

### 9. Bouton import avec nom

Le bouton "Importer .pol" affiche le nom de la polaire chargee (ex: "Sunlight 30", "Django980"). Se met a jour automatiquement a l'import.

---

## Architecture CSS

```css
:root {
  --accent: #43728b;     /* bleu Origami/Sillage */
  --bg: #FFFDF9;
  --text: #2c2c2c;
  --text-muted: #777;
  --border: #ddd;
  --danger: #d44;
  --radius: 6px;
}
```

- Police : Atkinson Hyperlegible
- Layout : flexbox 2 colonnes (chart sticky + table scrollable)
- Chart dans un conteneur avec tooltip positionne en absolu
- Table responsive avec overflow-x auto
- BEM-like pour les classes

## Points d'attention pour l'integration Next.js

1. **Le code est 100% vanilla** — pas de React, pas de bundler. Il faudra soit :
   - Le convertir en composants React (recommande)
   - Le servir comme page statique depuis `public/`

2. **Les polaires .pol** dans `polarlib/` font ~5Mo total — a servir en statique ou via API route

3. **`index.json`** est le catalogue des polaires disponibles — genere par script, a regenerer si des .pol sont ajoutes

4. **Les fonts** (Atkinson Hyperlegible) sont chargees depuis Google Fonts — adapter si Sillage a deja son systeme de fonts

5. **Le SVG** est genere par string concatenation — en React, on pourra utiliser JSX directement

6. **Le zoom/pan** manipule le viewBox — compatible React si on garde une ref au SVG

7. **Les `contenteditable`** pour le tableau — en React, des `<input>` seraient plus propres

8. **Le select de comparaison** charge les .pol via `fetch` depuis `polarlib/` — en Next.js, une API route ou un import statique serait mieux

---

## Fichiers source de reference

Les fichiers dans ce dossier sont la version de travail la plus recente. Le code dans le repo Origami-voilier peut ne pas avoir les dernieres modifications (le select deroulant notamment).
