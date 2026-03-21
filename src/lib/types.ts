/** Point GPS analysé issu d'un fichier GPX/KML */
export interface PointAnalyse {
  lat: number;
  lon: number;
  timestamp: Date | null;
  speedKn: number | null;
  headingDeg: number | null;
  elevationM: number | null;
  /** Distance cumulée depuis le début de la trace (NM) — rempli par calculerStatsCumulatives */
  distanceCumuleeNm?: number;
  /** Temps écoulé depuis le début de la trace (secondes) — rempli par calculerStatsCumulatives */
  tempsEcouleSecondes?: number | null;
}

/** Trace analysee (nom + points) */
export interface TraceAnalysee {
  name: string;
  points: PointAnalyse[];
}

/** Statistiques calculées d'une trace */
export interface StatistiquesTrace {
  distanceNm: number;
  durationSeconds: number;
  avgSpeedKn: number;
  maxSpeedKn: number;
}

/** Trace complète avec points (pour la page détail) */
export interface TraceAvecPoints {
  id: string;
  name: string;
  filename: string;
  format: string;
  source: string;
  createdAt: string;
  startedAt: string | null;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  points: {
    lat: number;
    lon: number;
    timestamp: string | null;
    speedKn: number | null;
    headingDeg: number | null;
    elevationM: number | null;
    pointIndex: number;
  }[];
}

/** Resume d'un bateau (pour la liste) */
export interface ResumeBateau {
  id: string;
  nom: string;
  classe: string | null;
  longueur: number | null;
  createdAt: string;
}

/** Resume d'un utilisateur (pour l'admin) */
export interface ResumeUtilisateur {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: {
    traces: number;
    bateaux: number;
  };
}

/** Résumé d'une trace (pour la liste) */
export interface ResumeTrace {
  id: string;
  name: string;
  filename: string;
  format: string;
  source: string;
  createdAt: string;
  startedAt: string | null;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  bateauId: string | null;
  bateau: { id: string; nom: string } | null;
}
