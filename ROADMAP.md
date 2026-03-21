# Navimeter — Roadmap

## MVP (v0.1)

- [x] Import de fichiers GPX
- [x] Import de fichiers KML
- [x] Détection automatique de la source (Navionics, SailGrib WR, Weather4D, Navimetrix, OpenCPN, Garmin, Google Earth, Strava)
- [x] Affichage de la trace sur carte maritime (OSM + OpenSeaMap)
- [x] Coloration de la trace par vitesse (bleu → rouge)
- [x] Statistiques de base : distance (NM), durée, vitesse moy/max (kn)
- [x] Graphique vitesse/temps
- [x] Liste des traces importées
- [x] Suppression de traces
- [x] Déploiement sur Railway

## Backlog (futures versions)

### Comparaison de traces
- [ ] Superposition de plusieurs traces sur la même carte
- [ ] Replay synchronisé de plusieurs traces (cas régate)
- [ ] Tableau comparatif des performances

### Analyse avancée
- [ ] Intégration données vent (depuis fichiers ou API météo)
- [ ] Calcul VMG (Velocity Made Good)
- [ ] Diagrammes polaires
- [ ] Analyse par segments (bord de près, bord de portant, empannages, virements)
- [ ] Détection automatique des manœuvres

### Replay et interaction
- [ ] Replay animé de la trace sur la carte avec contrôle de vitesse
- [ ] Curseur lié entre le graphique et la carte (hover sync)
- [ ] Timeline interactive

### Export et partage
- [ ] Export des stats en PDF
- [ ] Partage de lien public pour une trace
- [ ] Export image de la carte avec la trace

### UX et ergonomie
- [ ] Mode sombre
- [ ] Gestion par dossiers/événements (regrouper les traces d'une même régate)
- [ ] Comptes utilisateurs et authentification

### Code et maintenance
- [ ] Refactorer le code en français (variables, fonctions, commentaires)
- [ ] Migration vers Prisma 7
- [ ] Migration vers Next.js 16

## Notes de collaboration

### Décisions techniques
- **Stack** : Next.js 15 + React 19 + TypeScript + Mantine + CSS vanilla
- **BDD** : PostgreSQL via Prisma (Railway)
- **Carte** : Leaflet + React-Leaflet, couches OSM + OpenSeaMap
- **Parsing** : @tmcw/togeojson pour GPX et KML
- **Hébergement** : Railway
- **Police** : Atkinson Hyperlegible Next
- **Couleurs** : jaune sunflower #F6BC00, bleu #43728B, gris chauds, blanc crème #FFFDF9 (alignée sur Origami-voilier)
