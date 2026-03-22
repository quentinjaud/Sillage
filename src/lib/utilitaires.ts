/**
 * Formate une durée en secondes en chaîne lisible.
 * Ex : 7320 → "2h 02m"
 */
export function formaterDuree(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Reduit un tableau a pointsMax elements espaces regulierement */
export function sousechantillonner<T>(donnees: T[], pointsMax: number): T[] {
  if (donnees.length <= pointsMax) return donnees;
  const pas = donnees.length / pointsMax;
  const resultat: T[] = [];
  for (let i = 0; i < pointsMax; i++) {
    resultat.push(donnees[Math.round(i * pas)]);
  }
  const dernierIndex = donnees.length - 1;
  if (Math.round((pointsMax - 1) * pas) !== dernierIndex) {
    resultat.push(donnees[dernierIndex]);
  }
  return resultat;
}
