/**
 * Statistiques cumulatives par point
 * Adapté des algorithmes de gpx.studio (licence MIT)
 */

import { haversineNm } from "./distance";

export interface StatsCumulatives {
  distanceCumuleeNm: number;
  tempsEcouleSecondes: number | null;
}

/**
 * Calcule la distance cumulée et le temps écoulé pour chaque point.
 * @returns Tableau de même longueur que l'entrée
 */
export function calculerStatsCumulatives(
  points: { lat: number; lon: number; timestamp: Date | null }[]
): StatsCumulatives[] {
  const resultats: StatsCumulatives[] = [];
  let distanceCumulee = 0;

  // Premier timestamp non-null comme référence
  const premierTimestamp =
    points.find((p) => p.timestamp !== null)?.timestamp ?? null;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      distanceCumulee += haversineNm(
        points[i - 1].lat,
        points[i - 1].lon,
        points[i].lat,
        points[i].lon
      );
    }

    let tempsEcoule: number | null = null;
    if (premierTimestamp && points[i].timestamp) {
      tempsEcoule = Math.round(
        (points[i].timestamp!.getTime() - premierTimestamp.getTime()) / 1000
      );
    }

    resultats.push({
      distanceCumuleeNm: Math.round(distanceCumulee * 100) / 100,
      tempsEcouleSecondes: tempsEcoule,
    });
  }

  return resultats;
}
