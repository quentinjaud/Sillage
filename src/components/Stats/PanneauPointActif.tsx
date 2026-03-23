"use client";

import { Gauge, Compass } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PointCarte, DonneeGraphee, CelluleMeteoClient } from "@/lib/types";
import { calculerTWA, bordTWA } from "@/lib/geo/twa";
import { IconeTWA } from "@/components/IconeTWA";

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
      <span className="point-actif-pill point-actif-pill-donnee" data-label="POS">{lat} {lon}</span>

      {/* Date/heure */}
      {dateHeure && <span className="point-actif-pill point-actif-pill-donnee" data-label="DATE">{dateHeure}</span>}

      {/* Vitesse — cliquable pour switch */}
      <button
        className={`point-actif-pill point-actif-pill-donnee ${donneeGraphee === "vitesse" ? "point-actif-pill-active" : ""}`}
        onClick={() => onChangeDonneeGraphee("vitesse")}
        disabled={donneeGraphee === "vitesse"}
        data-label="VIT"
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
        data-label="CAP"
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
          data-label="TWA"
        >
          <IconeTWA className="point-actif-pill-icon" />
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
