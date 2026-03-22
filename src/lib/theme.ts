/**
 * Constantes de couleurs du thème Sillage.
 * Source de vérité unique pour les couleurs, utilisable partout
 * (y compris dans les contextes non-React comme Recharts).
 *
 * Les variables CSS dans globals.css doivent rester synchronisées.
 */
export const COULEURS = {
  /** Bleu principal — accent, liens, graphiques */
  accent: "#43728B",
  /** Jaune — highlight, CTA */
  jaune: "#F6BC00",
  /** Fond crème */
  fond: "#FFFDF9",
  /** Texte principal */
  texte: "#2c2c2c",
  /** Texte secondaire */
  texteSecondaire: "#787774",
  /** Texte léger */
  texteLeger: "#9b9a97",
  /** Bordures */
  bordure: "#e9e9e7",
  /** Grille des graphiques */
  grille: "#e9e9e7",
  /** Succès */
  succes: "#2e7d6f",
  /** Danger */
  danger: "#d32f2f",
} as const;
