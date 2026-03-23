"use client";

import type { CelluleMeteoClient, StatsVent, DonneeGraphee } from "@/lib/types";

interface PropsRoseDesVents {
  celluleActive: CelluleMeteoClient | null;
  statsVent: StatsVent;
  donneeGraphee: DonneeGraphee;
  onClick: () => void;
}

export default function RoseDesVents({
  celluleActive,
  statsVent,
  donneeGraphee,
  onClick,
}: PropsRoseDesVents) {
  const directionDeg =
    celluleActive?.ventDirectionDeg ?? statsVent.directionMoyenneDeg;
  const vitesseKn = celluleActive?.ventVitesseKn ?? statsVent.ventMoyenKn;
  const estActif = donneeGraphee === "vent";

  return (
    <button
      className={`rose-des-vents${estActif ? " rose-des-vents--active" : ""}`}
      onClick={onClick}
      title={`Vent ${vitesseKn.toFixed(1)} kn — direction ${Math.round(directionDeg)}° — cliquer pour afficher le graphique de vent`}
      aria-pressed={estActif}
    >
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Cercle de fond */}
        <circle cx="30" cy="30" r="26" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

        {/* Axes cardinaux (lignes pointillées) */}
        <line x1="30" y1="6" x2="30" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="30" y1="46" x2="30" y2="54" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="6" y1="30" x2="14" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="46" y1="30" x2="54" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />

        {/* Labels cardinaux */}
        <text x="30" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">N</text>
        <text x="30" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">S</text>
        <text x="55" y="30" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">E</text>
        <text x="5" y="30" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">O</text>

        {/* Fleche de direction du vent (rotee depuis le centre) */}
        {/* La convention meteorologique : directionDeg = provenance du vent.
            0° = vent du nord (souffle vers le sud). La fleche pointe DEPUIS la direction d'ou vient le vent.
            Rotation autour du centre (30,30). Sans rotation = fleche pointe vers le bas (vent du nord → souffle vers le sud). */}
        <g transform={`rotate(${directionDeg}, 30, 30)`}>
          {/* Corps de la fleche */}
          <line x1="30" y1="16" x2="30" y2="38" stroke="#F6BC00" strokeWidth="2.5" strokeLinecap="round" />
          {/* Pointe de fleche vers le bas (direction vers laquelle souffle le vent) */}
          <polygon
            points="30,44 25,36 35,36"
            fill="#F6BC00"
          />
          {/* Point de depart (cercle a l'origine = d'ou vient le vent) */}
          <circle cx="30" cy="14" r="2.5" fill="#F6BC00" />
        </g>

        {/* Point central */}
        <circle cx="30" cy="30" r="2" fill="rgba(255,255,255,0.5)" />
      </svg>

      {/* Vitesse sous la rose */}
      <div className="rose-des-vents-vitesse">
        {vitesseKn.toFixed(1)} <span className="rose-des-vents-unite">kn</span>
      </div>
    </button>
  );
}
