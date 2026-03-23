"use client";

import { Gauge, Compass } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PointCarte, DonneeGraphee, CelluleMeteoClient } from "@/lib/types";
import { calculerTWA, bordTWA } from "@/lib/geo/twa";

interface PropsPanneauPointActif {
  pointActif: PointCarte;
  donneeGraphee: DonneeGraphee;
  onChangeDonneeGraphee: (d: DonneeGraphee) => void;
  capDisponible: boolean;
  celluleActive: CelluleMeteoClient | null;
}

/** Convertit des degres decimaux en degres, minutes, milliemes */
function formaterCoordonnee(decimal: number, positif: string, negatif: string): string {
  const signe = decimal >= 0 ? positif : negatif;
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minDecimal = (abs - deg) * 60;
  const min = Math.floor(minDecimal);
  const milliemes = Math.round((minDecimal - min) * 1000);
  return `${deg}°${String(min).padStart(2, "0")}'${String(milliemes).padStart(3, "0")}${signe}`;
}

export default function PanneauPointActif({
  pointActif,
  donneeGraphee,
  onChangeDonneeGraphee,
  capDisponible,
  celluleActive,
}: PropsPanneauPointActif) {
  const lat = formaterCoordonnee(pointActif.lat, "N", "S");
  const lon = formaterCoordonnee(pointActif.lon, "E", "W");

  const dateHeure = pointActif.timestamp
    ? format(new Date(pointActif.timestamp), "dd MMM yyyy  HH:mm:ss", { locale: fr })
    : null;

  return (
    <div className="point-actif-pills">
      {/* Position GPS */}
      <span className="point-actif-pill">{lat} {lon}</span>

      {/* Date/heure */}
      {dateHeure && <span className="point-actif-pill">{dateHeure}</span>}

      {/* Vitesse — cliquable pour switch */}
      <button
        className={`point-actif-pill point-actif-pill-donnee ${donneeGraphee === "vitesse" ? "point-actif-pill-active" : ""}`}
        onClick={() => onChangeDonneeGraphee("vitesse")}
        disabled={donneeGraphee === "vitesse"}
      >
        <Gauge className="point-actif-pill-icon" />
        {pointActif.speedKn != null ? pointActif.speedKn.toFixed(1) : "—"} kn
      </button>

      {/* Cap — cliquable pour switch */}
      <button
        className={`point-actif-pill point-actif-pill-donnee ${donneeGraphee === "cap" ? "point-actif-pill-active" : ""}`}
        onClick={() => onChangeDonneeGraphee("cap")}
        disabled={donneeGraphee === "cap" || !capDisponible}
        title={!capDisponible ? "Pas de donnees de cap" : undefined}
      >
        <Compass className="point-actif-pill-icon" />
        {pointActif.headingDeg != null ? `${Math.round(pointActif.headingDeg)}°` : "—"}
      </button>

      {/* TWA — visible seulement si cap + vent dispo */}
      {capDisponible && celluleActive && (
        <button
          className={`point-actif-pill point-actif-pill-donnee ${donneeGraphee === "twa" ? "point-actif-pill-active" : ""}`}
          onClick={() => onChangeDonneeGraphee("twa")}
          disabled={donneeGraphee === "twa"}
        >
          <svg className="point-actif-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: "rotate(45deg)" }}>
            <defs>
              <mask id="twa-cut">
                <rect width="24" height="24" fill="white"/>
                <g transform="rotate(-20 12 12) scale(0.7) translate(5 7)">
                  <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" stroke="black" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.6 4.6A2 2 0 1 1 11 8H2" stroke="black" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.6 19.4A2 2 0 1 0 14 16H2" stroke="black" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </mask>
            </defs>
            <g mask="url(#twa-cut)">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.49 1.809a.5.5 0 0 1 .879-.008l1.517 2.726a19.999 19.999 0 0 1 2.358 7.151l.295 2.278c.305 2.346.19 4.729-.337 7.035l-.098.43a2 2 0 0 1-1.941 1.553l-4.31.019a2 2 0 0 1-1.959-1.556l-.104-.458a20 20 0 0 1-.331-7.01l.32-2.469a20 20 0 0 1 2.193-6.847L11.49 1.81Z" fill="currentColor"/>
            </g>
            <g transform="rotate(-20 12 12) scale(0.7) translate(5 7)">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>
          {(() => {
            if (pointActif.headingDeg == null) return "—";
            const twa = calculerTWA(pointActif.headingDeg, celluleActive.ventDirectionDeg);
            return `${Math.abs(Math.round(twa))}° ${bordTWA(twa)}`;
          })()}
        </button>
      )}
    </div>
  );
}
