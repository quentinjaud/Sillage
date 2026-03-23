import type { CelluleMeteoClient } from "../types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Moyenne circulaire des angles (en degres).
 * Utilise atan2(mean(sin), mean(cos)) pour gerer le wrap-around 0/360.
 */
export function moyenneCirculaire(anglesDeg: number[]): number {
  if (anglesDeg.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of anglesDeg) {
    sinSum += Math.sin(a * DEG_TO_RAD);
    cosSum += Math.cos(a * DEG_TO_RAD);
  }
  const moyenne = Math.atan2(sinSum / anglesDeg.length, cosSum / anglesDeg.length) * RAD_TO_DEG;
  return moyenne < 0 ? moyenne + 360 : moyenne;
}

/**
 * Ecart-type circulaire (en degres).
 * Formule : sqrt(-2 * ln(R)) en radians, ou R = longueur du vecteur moyen.
 */
export function ecartTypeCirculaire(anglesDeg: number[]): number {
  if (anglesDeg.length <= 1) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of anglesDeg) {
    sinSum += Math.sin(a * DEG_TO_RAD);
    cosSum += Math.cos(a * DEG_TO_RAD);
  }
  const n = anglesDeg.length;
  const R = Math.sqrt((sinSum / n) ** 2 + (cosSum / n) ** 2);
  if (R >= 1) return 0;
  return Math.sqrt(-2 * Math.log(R)) * RAD_TO_DEG;
}

/**
 * Calcule les stats vent agregees a partir des cellules meteo.
 * Moyenne vitesse ponderee par duree, rafales max, direction circulaire.
 */
export function calculerStatsVent(cellules: CelluleMeteoClient[]): {
  ventMoyenKn: number;
  rafalesMaxKn: number;
  directionMoyenneDeg: number;
  variationDirectionDeg: number;
} {
  if (cellules.length === 0) {
    return { ventMoyenKn: 0, rafalesMaxKn: 0, directionMoyenneDeg: 0, variationDirectionDeg: 0 };
  }

  let sommePonderee = 0;
  let sommeDurees = 0;
  let rafalesMax = 0;
  const directions: number[] = [];

  for (const c of cellules) {
    const duree = new Date(c.dateFin).getTime() - new Date(c.dateDebut).getTime();
    sommePonderee += c.ventVitesseKn * duree;
    sommeDurees += duree;
    if (c.ventRafalesKn > rafalesMax) rafalesMax = c.ventRafalesKn;
    directions.push(c.ventDirectionDeg);
  }

  return {
    ventMoyenKn: sommeDurees > 0 ? sommePonderee / sommeDurees : 0,
    rafalesMaxKn: rafalesMax,
    directionMoyenneDeg: moyenneCirculaire(directions),
    variationDirectionDeg: ecartTypeCirculaire(directions),
  };
}

/**
 * Trouve la cellule meteo active pour un point donne (timestamp + position).
 * 1. Filtre par temps (dateDebut <= timestamp < dateFin)
 * 2. Parmi celles-ci, prend la plus proche spatialement
 */
export function trouverCelluleActive(
  cellules: CelluleMeteoClient[],
  timestamp: string | null,
  lat: number,
  lon: number
): CelluleMeteoClient | null {
  if (!timestamp || cellules.length === 0) return null;

  const t = new Date(timestamp).getTime();

  const candidates = cellules.filter((c) => {
    const debut = new Date(c.dateDebut).getTime();
    const fin = new Date(c.dateFin).getTime();
    return t >= debut && t < fin;
  });

  if (candidates.length === 0) {
    let meilleure = cellules[0];
    let minDist = Infinity;
    for (const c of cellules) {
      const centre = (new Date(c.dateDebut).getTime() + new Date(c.dateFin).getTime()) / 2;
      const dist = Math.abs(t - centre);
      if (dist < minDist) { minDist = dist; meilleure = c; }
    }
    return meilleure;
  }

  if (candidates.length === 1) return candidates[0];

  let meilleure = candidates[0];
  let minDist = Infinity;
  for (const c of candidates) {
    const dist = (c.latitude - lat) ** 2 + (c.longitude - lon) ** 2;
    if (dist < minDist) { minDist = dist; meilleure = c; }
  }
  return meilleure;
}
