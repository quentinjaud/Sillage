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
    id: string;
    lat: number;
    lon: number;
    timestamp: string | null;
    speedKn: number | null;
    headingDeg: number | null;
    elevationM: number | null;
    pointIndex: number;
    isExcluded: boolean;
  }[];
}

/** Point dans la vue nettoyage (enrichi avec info d'aberration) */
export interface PointNettoyage {
  id: string;
  pointIndex: number;
  lat: number;
  lon: number;
  timestamp: string | null;
  speedKn: number | null;
  headingDeg: number | null;
  isExcluded: boolean;
  typeAberrant: "pic_vitesse" | "saut_gps" | "timestamp_anormal" | null;
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

// === Vue trace / navigation ===

/** Point pour la carte et les graphiques (serialise depuis le server component) */
export interface PointCarte {
  lat: number;
  lon: number;
  timestamp: string | null;
  speedKn: number | null;
  headingDeg: number | null;
  elevationM: number | null;
  pointIndex: number;
}

export interface CelluleMeteoClient {
  latitude: number;
  longitude: number;
  dateDebut: string;
  dateFin: string;
  ventVitesseKn: number;
  ventRafalesKn: number;
  ventDirectionDeg: number;
}

export interface StatsVent {
  ventMoyenKn: number;
  rafalesMaxKn: number;
  directionMoyenneDeg: number;
  variationDirectionDeg: number;
  source: string;
  resolution: string;
}

/** Donnee affichee dans le graphique — extensible pour NMEA futur */
export type DonneeGraphee = "vitesse" | "cap" | "vent" | "ventDirection";

// === Journal de bord ===

export interface ResumeDossier {
  id: string;
  nom: string;
  description: string | null;
  nbAventures: number;
  nbNavigations: number;
  createdAt: string;
}

export interface ResumeAventure {
  id: string;
  nom: string;
  description: string | null;
  navigations: ResumeNavigation[];
  createdAt: string;
}

export interface ResumeTraceNavigation {
  id: string;
  name: string;
  bateau: { id: string; nom: string } | null;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  polylineSimplifiee: [number, number][] | null;
}

export interface ResumeNavigation {
  id: string;
  nom: string;
  date: string;
  type: "SOLO" | "REGATE";
  dossierId: string;
  aventureId: string | null;
  trace: ResumeTraceNavigation | null;
  createdAt: string;
}

export interface ContenuDossier {
  aventures: ResumeAventure[];
  navigationsOrphelines: ResumeNavigation[];
}
