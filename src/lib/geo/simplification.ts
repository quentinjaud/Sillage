/**
 * Simplification Ramer-Douglas-Peucker
 * Adapté des algorithmes de gpx.studio (licence MIT)
 */

import { enRadians } from "./math";
import { haversineNm } from "./distance";
import { capDeg } from "./heading";

/**
 * Distance perpendiculaire (cross-track) d'un point à un segment en NM.
 * Utilise la formule de distance cross-track sphérique.
 */
function distanceCrossTrackNm(
  point: { lat: number; lon: number },
  debut: { lat: number; lon: number },
  fin: { lat: number; lon: number }
): number {
  const RAYON_TERRE_NM = 3440.065;
  const distDebutPoint = haversineNm(debut.lat, debut.lon, point.lat, point.lon);
  const capDebutPoint = enRadians(capDeg(debut.lat, debut.lon, point.lat, point.lon));
  const capDebutFin = enRadians(capDeg(debut.lat, debut.lon, fin.lat, fin.lon));

  const crossTrack = Math.asin(
    Math.sin(distDebutPoint / RAYON_TERRE_NM) *
      Math.sin(capDebutPoint - capDebutFin)
  );

  return Math.abs(crossTrack * RAYON_TERRE_NM);
}

/**
 * Simplifie un tableau de points GPS avec l'algorithme Ramer-Douglas-Peucker.
 * @param points - Tableau de points avec au minimum lat/lon
 * @param toleranceNm - Tolérance en milles nautiques (ex: 0.001 ≈ 1.85m)
 * @returns Nouveau tableau de points simplifiés (ne mute pas l'entrée)
 */
export function simplifierRDP<T extends { lat: number; lon: number }>(
  points: T[],
  toleranceNm: number
): T[] {
  if (points.length <= 2) return [...points];

  // Trouver le point le plus éloigné du segment premier-dernier
  let distMax = 0;
  let indexMax = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = distanceCrossTrackNm(
      points[i],
      points[0],
      points[points.length - 1]
    );
    if (dist > distMax) {
      distMax = dist;
      indexMax = i;
    }
  }

  // Si la distance max dépasse la tolérance, simplifier récursivement
  if (distMax > toleranceNm) {
    const gauche = simplifierRDP(points.slice(0, indexMax + 1), toleranceNm);
    const droite = simplifierRDP(points.slice(indexMax), toleranceNm);
    // Fusionner en évitant le doublon au point de jonction
    return [...gauche.slice(0, -1), ...droite];
  }

  // Sinon, ne garder que les extrémités
  return [points[0], points[points.length - 1]];
}
