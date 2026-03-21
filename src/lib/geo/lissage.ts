/**
 * Lissage de traces GPS
 * Adapté des algorithmes de gpx.studio (licence MIT)
 */

/**
 * Lissage par moyenne mobile sur les vitesses et caps.
 * Ne modifie PAS les coordonnées lat/lon ni les timestamps.
 * @param points - Points à lisser
 * @param tailleFenetre - Nombre de points dans la fenêtre (impair recommandé, défaut: 5)
 * @returns Nouveau tableau avec speedKn et headingDeg lissés
 */
export function lisserMoyenneMobile<
  T extends { speedKn: number | null; headingDeg: number | null }
>(points: T[], tailleFenetre: number = 5): T[] {
  if (points.length <= 2) return points.map((p) => ({ ...p }));

  const demiF = Math.floor(tailleFenetre / 2);
  return points.map((point, i) => {
    const debut = Math.max(0, i - demiF);
    const fin = Math.min(points.length - 1, i + demiF);
    const fenetre = points.slice(debut, fin + 1);

    // Moyenne mobile sur la vitesse
    const vitesses = fenetre
      .map((p) => p.speedKn)
      .filter((v): v is number => v !== null);
    const vitesseLissee =
      vitesses.length > 0
        ? vitesses.reduce((a, b) => a + b, 0) / vitesses.length
        : null;

    // Moyenne circulaire sur le cap (gère le passage 360°/0°)
    const caps = fenetre
      .map((p) => p.headingDeg)
      .filter((c): c is number => c !== null);
    let capLisse: number | null = null;
    if (caps.length > 0) {
      const sinMoy =
        caps.reduce((s, c) => s + Math.sin((c * Math.PI) / 180), 0) /
        caps.length;
      const cosMoy =
        caps.reduce((s, c) => s + Math.cos((c * Math.PI) / 180), 0) /
        caps.length;
      capLisse =
        (((Math.atan2(sinMoy, cosMoy) * 180) / Math.PI) % 360 + 360) % 360;
    }

    return {
      ...point,
      speedKn: vitesseLissee,
      headingDeg: capLisse,
    };
  });
}

/**
 * Lissage gaussien (pondéré) sur les vitesses.
 * @param points - Points à lisser
 * @param sigma - Écart-type du noyau gaussien (défaut: 2)
 * @returns Nouveau tableau avec speedKn lissé
 */
export function lisserGaussien<T extends { speedKn: number | null }>(
  points: T[],
  sigma: number = 2
): T[] {
  if (points.length <= 2) return points.map((p) => ({ ...p }));

  // Taille du noyau : ±3 sigma
  const rayon = Math.ceil(3 * sigma);

  // Précalculer le noyau gaussien
  const noyau: number[] = [];
  let sommeNoyau = 0;
  for (let j = -rayon; j <= rayon; j++) {
    const poids = Math.exp(-(j * j) / (2 * sigma * sigma));
    noyau.push(poids);
    sommeNoyau += poids;
  }
  // Normaliser
  for (let j = 0; j < noyau.length; j++) {
    noyau[j] /= sommeNoyau;
  }

  return points.map((point, i) => {
    if (point.speedKn === null) return { ...point };

    let vitessePonderee = 0;
    let poidsTotal = 0;

    for (let j = -rayon; j <= rayon; j++) {
      const idx = i + j;
      if (idx < 0 || idx >= points.length) continue;
      const vitesse = points[idx].speedKn;
      if (vitesse === null) continue;

      const poids = noyau[j + rayon];
      vitessePonderee += vitesse * poids;
      poidsTotal += poids;
    }

    return {
      ...point,
      speedKn: poidsTotal > 0 ? vitessePonderee / poidsTotal : null,
    };
  });
}
