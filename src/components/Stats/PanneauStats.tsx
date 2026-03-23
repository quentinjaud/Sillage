"use client";

import { Anchor, ArrowUpDown, ChevronUp, ChevronDown, Clock, Gauge, Loader2, Navigation, Wind, Zap } from "lucide-react";
import { useState } from "react";
import { formaterDuree } from "@/lib/utilitaires";
import type { CelluleMeteoClient, StatsVent } from "@/lib/types";

interface PropsPanneauStats {
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  traceId?: string;
  statsVent?: StatsVent | null;
  traceTimestamps?: boolean;
  traceTropRecente?: boolean;
  onMeteoChargee?: (data: { statsVent: StatsVent; cellules: CelluleMeteoClient[] }) => void;
  onMeteoSupprimee?: () => void;
  onReduitChange?: (reduit: boolean) => void;
}

function LigneStat({
  icon: Icone,
  etiquette,
  valeur,
  unite,
}: {
  icon: React.ElementType;
  etiquette: string;
  valeur: string;
  unite: string;
}) {
  return (
    <div className="stat-ligne">
      <div className="stat-ligne-label">
        <Icone className="stat-ligne-icon" />
        <span>{etiquette}</span>
      </div>
      <span className="stat-ligne-valeur">
        {valeur}
        <span className="stat-ligne-unite">{unite}</span>
      </span>
    </div>
  );
}

function directionCardinale(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

export default function PanneauStats({
  distanceNm,
  durationSeconds,
  avgSpeedKn,
  maxSpeedKn,
  traceId,
  statsVent,
  traceTimestamps,
  traceTropRecente,
  onMeteoChargee,
  onMeteoSupprimee,
  onReduitChange,
}: PropsPanneauStats) {
  const [reduit, setReduitLocal] = useState(false);
  const setReduit = (v: boolean) => {
    setReduitLocal(v);
    onReduitChange?.(v);
  };
  const [etat, setEtat] = useState<"idle" | "chargement" | "erreur">("idle");
  const [messageErreur, setMessageErreur] = useState<string | null>(null);

  async function enrichirMeteo() {
    if (!traceId) return;
    setEtat("chargement");
    setMessageErreur(null);
    try {
      const reponse = await fetch(`/api/traces/${traceId}/meteo`, {
        method: "POST",
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps?.error ?? `Erreur ${reponse.status}`);
      }
      const donnees = await reponse.json();
      setEtat("idle");
      onMeteoChargee?.(donnees);
    } catch (err) {
      setEtat("erreur");
      setMessageErreur(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  async function supprimerMeteo() {
    if (!traceId) return;
    try {
      const reponse = await fetch(`/api/traces/${traceId}/meteo`, {
        method: "DELETE",
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps?.error ?? `Erreur ${reponse.status}`);
      }
      onMeteoSupprimee?.();
    } catch {
      // suppression silencieuse
    }
  }

  const dirMoy = statsVent
    ? `${Math.round(statsVent.directionMoyenneDeg / 5) * 5}° ${directionCardinale(statsVent.directionMoyenneDeg)}`
    : null;

  // Mode reduit : 2 lignes compactes
  if (reduit) {
    return (
      <div className="panneau-stats-compact panneau-stats--reduit">
        <div className="stats-ligne-reduite">
          <span className="stats-val-reduite" title="Distance">
            <Anchor size={12} />
            {distanceNm?.toFixed(2) ?? "—"}<small>NM</small>
          </span>
          <span className="stats-val-reduite" title="Duree">
            <Clock size={12} />
            {durationSeconds ? formaterDuree(durationSeconds) : "—"}
          </span>
          <span className="stats-val-reduite" title="Vitesse moyenne">
            <Gauge size={12} />
            {avgSpeedKn?.toFixed(1) ?? "—"}<small>kn</small>
          </span>
        </div>
        {statsVent && (
          <div className="stats-ligne-reduite stats-ligne-reduite--vent">
            <span className="stats-val-reduite" title="Vent moyen">
              <Wind size={12} />
              {Math.round(statsVent.ventMoyenKn)}<sup>{Math.round(statsVent.rafalesMaxKn)}</sup><small>kn</small>
            </span>
            <span className="stats-val-reduite stats-val-reduite--droite" title="Direction moyenne">
              <Navigation size={12} />
              {dirMoy}
            </span>
          </div>
        )}
        <button
          className="stats-toggle"
          onClick={() => setReduit(false)}
          title="Deployer les statistiques"
          type="button"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  // Mode deploye : toutes les stats
  return (
    <div className="panneau-stats-compact">
      <button
        className="stats-toggle"
        onClick={() => setReduit(true)}
        title="Reduire les statistiques"
        type="button"
      >
        <ChevronUp size={14} />
      </button>
      <LigneStat
        icon={Anchor}
        etiquette="Distance"
        valeur={distanceNm?.toFixed(2) ?? "—"}
        unite="NM"
      />
      <LigneStat
        icon={Clock}
        etiquette="Duree"
        valeur={durationSeconds ? formaterDuree(durationSeconds) : "—"}
        unite=""
      />
      <LigneStat
        icon={Gauge}
        etiquette="V. moy."
        valeur={avgSpeedKn?.toFixed(1) ?? "—"}
        unite="kn"
      />
      <LigneStat
        icon={Navigation}
        etiquette="V. max"
        valeur={maxSpeedKn?.toFixed(1) ?? "—"}
        unite="kn"
      />

      {statsVent ? (
        <div className="stats-vent-bloc">
          <div className="stats-vent-separateur" />
          <LigneStat
            icon={Wind}
            etiquette="Vent moy."
            valeur={Math.round(statsVent.ventMoyenKn).toString()}
            unite="kn"
          />
          <LigneStat
            icon={Zap}
            etiquette="Rafales"
            valeur={Math.round(statsVent.rafalesMaxKn).toString()}
            unite="kn"
          />
          <LigneStat
            icon={Navigation}
            etiquette="Direction"
            valeur={dirMoy!}
            unite=""
          />
          <LigneStat
            icon={ArrowUpDown}
            etiquette="Var. dir."
            valeur={`±${statsVent.variationDirectionDeg.toFixed(0)}`}
            unite="°"
          />
          <div className="stats-vent-source">
            <span>AROME France · 2.5km/1h</span>
            <button
              className="stats-vent-supprimer"
              onClick={supprimerMeteo}
              type="button"
            >
              Supprimer meteo
            </button>
          </div>
        </div>
      ) : (
        <div className="stats-meteo-enrichir">
          {traceTimestamps === false ? (
            <button
              className="stats-enrichir-btn stats-enrichir-btn--desactive"
              disabled
              type="button"
            >
              <Wind size={13} />
              Timestamps requis
            </button>
          ) : etat === "chargement" ? (
            <button
              className="stats-enrichir-btn stats-enrichir-btn--chargement"
              disabled
              type="button"
            >
              <Loader2 size={13} className="stats-enrichir-spinner" />
              Chargement…
            </button>
          ) : (
            <>
              <button
                className="stats-enrichir-btn"
                onClick={enrichirMeteo}
                type="button"
              >
                <Wind size={13} />
                Enrichir en recuperant les donnees meteo
              </button>
              {etat === "erreur" && messageErreur && (
                <span className="stats-enrichir-erreur">{messageErreur}</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
