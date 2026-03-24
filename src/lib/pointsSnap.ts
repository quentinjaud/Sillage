// src/lib/pointsSnap.ts
/**
 * Points de snap predefinies sur la zone cotiere OGF (-28.90 / 48.43, zoom 8).
 * Chaque point represente un "port" fictif ou un dossier peut se placer.
 * Coordonnees relevees manuellement sur la cote gauche de la zone.
 */
export interface PointSnap {
  lat: number;
  lon: number;
  nom: string;
}

export const POINTS_SNAP: PointSnap[] = [
  { lat: -28.12, lon: 47.85, nom: "Port Nord" },
  { lat: -28.35, lon: 47.72, nom: "Baie des Brumes" },
  { lat: -28.58, lon: 47.90, nom: "Cap Ouest" },
  { lat: -28.80, lon: 48.05, nom: "Anse du Phare" },
  { lat: -29.05, lon: 47.95, nom: "Port du Levant" },
  { lat: -29.30, lon: 48.10, nom: "Crique Sauvage" },
  { lat: -29.55, lon: 47.80, nom: "Ile du Large" },
  { lat: -28.25, lon: 48.20, nom: "Pointe des Vents" },
  { lat: -28.65, lon: 48.30, nom: "Havre Tranquille" },
  { lat: -29.10, lon: 48.35, nom: "Mouillage Sud" },
  { lat: -29.45, lon: 48.25, nom: "Baie Cachee" },
  { lat: -28.45, lon: 48.50, nom: "Port Central" },
];

/** Centre de la zone OGF pour la vue initiale */
export const VUE_INITIALE_OGF = {
  latitude: -28.90,
  longitude: 48.43,
  zoom: 8,
} as const;

/** Zone d'eau libre pour projeter les traces (cote droit du viewport) */
export const ZONE_PROJECTION_TRACE = {
  lat: -28.90,
  lon: 49.50,
} as const;

/**
 * Trouve le point de snap le plus proche non encore utilise.
 * @param positionsUtilisees - coordonnees deja prises par d'autres dossiers
 */
export function prochainPointSnap(
  positionsUtilisees: { lat: number; lon: number }[]
): PointSnap {
  const utilises = new Set(
    positionsUtilisees.map((p) => `${p.lat},${p.lon}`)
  );
  const libre = POINTS_SNAP.find(
    (p) => !utilises.has(`${p.lat},${p.lon}`)
  );
  return libre ?? POINTS_SNAP[0];
}

/**
 * Trouve le point de snap le plus proche d'une position donnee.
 * Utilise pour le drag-and-drop des marqueurs.
 */
export function snapperVersPointProche(lat: number, lon: number): PointSnap {
  let meilleur = POINTS_SNAP[0];
  let minDist = Infinity;
  for (const p of POINTS_SNAP) {
    const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
    if (d < minDist) {
      minDist = d;
      meilleur = p;
    }
  }
  return meilleur;
}

/** Nom du dossier par defaut auto-cree */
export const NOM_DOSSIER_DEFAUT = "Non classes";

/** Position fixe du marqueur "Non classes" */
export const POSITION_DOSSIER_DEFAUT = {
  lat: -29.70,
  lon: 48.00,
} as const;
