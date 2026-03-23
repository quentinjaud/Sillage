"use client";

import { Wind, Navigation2 } from "lucide-react";
import type { CelluleMeteoClient, StatsVent } from "@/lib/types";

interface PropsRoseDesVents {
  celluleActive: CelluleMeteoClient | null;
  statsVent: StatsVent;
  ventDeploye?: boolean;
  donneeVentDeployee?: "vent" | "ventDirection";
  mapBearing?: number;
  onClick: () => void;
}

export default function RoseDesVents({
  celluleActive,
  statsVent,
  ventDeploye,
  donneeVentDeployee,
  mapBearing = 0,
  onClick,
}: PropsRoseDesVents) {
  const directionDeg =
    celluleActive?.ventDirectionDeg ?? statsVent.directionMoyenneDeg;
  const vitesseKn = celluleActive?.ventVitesseKn ?? statsVent.ventMoyenKn;

  // Rotation de l'icone vent : provenance ajustee au bearing de la carte + 90° (Wind pointe a droite)
  const rotationIcone = directionDeg - mapBearing + 90;

  // Mode replie : HUD complet
  if (!ventDeploye) {
    return (
      <button
        className="rose-des-vents"
        onClick={onClick}
        title={`Vent ${Math.round(vitesseKn)} kt — ${Math.round(directionDeg)}° — cliquer pour deployer`}
      >
        <div className="rose-des-vents-rose">
          {/* Cercle + cardinaux */}
          <svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            fill="none"
            className="rose-des-vents-fond"
            aria-hidden="true"
          >
            <circle cx="30" cy="30" r="26" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <line x1="30" y1="6" x2="30" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="30" y1="46" x2="30" y2="54" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="6" y1="30" x2="14" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="46" y1="30" x2="54" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="2,2" />
            <text x="30" y="8" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">N</text>
            <text x="30" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">S</text>
            <text x="55" y="30" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">E</text>
            <text x="5" y="30" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill="rgba(255,255,255,0.7)" fontFamily="inherit">O</text>
          </svg>
          {/* Icone vent tournee — taille proportionnelle a la force (14-34px pour 5-20 kn) */}
          {(() => {
            const ratio = Math.max(0, Math.min(1, (vitesseKn - 5) / 15));
            const taille = 14 + ratio * 20;
            return (
              <div className="rose-des-vents-icone" style={{ transform: `rotate(${rotationIcone}deg)` }}>
                <Wind size={taille} color="#F6BC00" strokeWidth={2.5} />
              </div>
            );
          })()}
        </div>
        <div className="rose-des-vents-vitesse">
          {Math.round(vitesseKn)} <span className="rose-des-vents-unite">kt</span>
        </div>
      </button>
    );
  }

  // Mode deploye : mini-bouton de bascule
  return (
    <button
      className="rose-des-vents rose-des-vents--active"
      onClick={onClick}
      title={donneeVentDeployee === "vent" ? "Basculer vers direction" : "Fermer"}
    >
      {donneeVentDeployee === "vent" ? <Wind size={16} /> : <Navigation2 size={16} />}
    </button>
  );
}
