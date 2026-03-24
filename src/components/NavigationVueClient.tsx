"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";

import TraceMapWrapper from "@/components/Map/TraceMapWrapper";
import TraceChart from "@/components/Stats/TraceChart";
import PanneauStats from "@/components/Stats/PanneauStats";
import PanneauPointActif from "@/components/Stats/PanneauPointActif";
import GraphiqueRedimensionnable from "@/components/Stats/GraphiqueRedimensionnable";
import RoseDesVents from "@/components/Map/RoseDesVents";
import { trouverCelluleActive } from "@/lib/geo/stats-vent";
import type { PointCarte, CelluleMeteoClient, StatsVent } from "@/lib/types";
import { useEtatVue, HAUTEUR_GRAPHIQUE_INITIALE } from "@/lib/hooks/useEtatVue";
import { COULEURS } from "@/lib/theme";

/** Couleur d'accent par type de navigation */
const ACCENT_PAR_TYPE: Record<string, string> = {
  SOLO: "var(--accent)",
  AVENTURE: "var(--accent-aventure)",
  REGATE: "var(--accent-yellow)",
};

const LABEL_TYPE: Record<string, string> = {
  SOLO: "Solo",
  AVENTURE: "Aventure",
  REGATE: "Regate",
};

interface PropsNavigationVueClient {
  navigationId: string;
  nom: string;
  date: string;
  type: "SOLO" | "AVENTURE" | "REGATE";
  bateau: { id: string; nom: string } | null;
  breadcrumb: string;
  points: PointCarte[];
  maxSpeed: number;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  traceId?: string;
  cellulesMeteo?: CelluleMeteoClient[];
  statsVent?: StatsVent | null;
  traceTimestamps?: boolean;
  traceTropRecente?: boolean;
}

export default function NavigationVueClient({
  navigationId,
  nom,
  date,
  type,
  bateau,
  breadcrumb,
  points,
  maxSpeed,
  distanceNm,
  durationSeconds,
  avgSpeedKn,
  maxSpeedKn,
  traceId,
  cellulesMeteo,
  statsVent,
  traceTimestamps,
  traceTropRecente,
}: PropsNavigationVueClient) {
  const router = useRouter();
  const {
    paddingBas,
    pointActifIndex,
    pointFixeIndex,
    handleHoverPoint,
    handleClickPoint,
    donneeGraphee,
    setDonneeGraphee,
    capDisponible,
    pointActif,
    handleHauteurChange,
  } = useEtatVue(points);

  // Edition metadonnees — synchro avec props serveur apres refresh
  const [nomEdite, setNomEdite] = useState(nom);
  const [enEditionNom, setEnEditionNom] = useState(false);
  const [dateEditee, setDateEditee] = useState(date.slice(0, 10));
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNomEdite(nom);
    setDateEditee(date.slice(0, 10));
  }, [nom, date]);

  // Etat meteo — peut etre mis a jour apres un fetch
  const [cellulesMeteoState, setCellulesMeteoState] = useState(cellulesMeteo ?? []);
  const [statsVentState, setStatsVentState] = useState(statsVent ?? null);

  // Sauvegarde generique d'un champ via PATCH
  const sauvegarderChamp = useCallback(
    async (champ: Record<string, unknown>) => {
      try {
        const reponse = await fetch(
          `/api/journal/navigations/${navigationId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(champ),
          }
        );
        if (!reponse.ok) throw new Error();
        router.refresh();
        return true;
      } catch {
        return false;
      }
    },
    [navigationId, router]
  );

  const sauvegarderNom = useCallback(async () => {
    const nomNettoye = nomEdite.trim();
    if (!nomNettoye || nomNettoye === nom) {
      setNomEdite(nom);
      setEnEditionNom(false);
      return;
    }
    const ok = await sauvegarderChamp({ nom: nomNettoye });
    if (!ok) setNomEdite(nom);
    setEnEditionNom(false);
  }, [nomEdite, nom, sauvegarderChamp]);

  const handleChangeDate = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const nouvelleDate = e.target.value;
      setDateEditee(nouvelleDate);
      if (nouvelleDate) {
        const ok = await sauvegarderChamp({ date: new Date(nouvelleDate).toISOString() });
        if (!ok) setDateEditee(date.slice(0, 10));
      }
    },
    [date, sauvegarderChamp]
  );

  const handleMeteoChargee = useCallback(
    (data: { statsVent: StatsVent; cellules: CelluleMeteoClient[] }) => {
      setStatsVentState(data.statsVent);
      setCellulesMeteoState(data.cellules);
    },
    []
  );

  const [ventDeploye, setVentDeploye] = useState(false);
  const [statsReduit, setStatsReduit] = useState(false);
  const [donneeVentDeployee, setDonneeVentDeployee] = useState<"vent" | "ventDirection">("vent");
  const [mapBearing, setMapBearing] = useState(0);

  const handleMeteoSupprimee = useCallback(() => {
    setStatsVentState(null);
    setCellulesMeteoState([]);
    setVentDeploye(false);
  }, []);

  const handleClickRoseDesVents = useCallback(() => {
    if (!ventDeploye) {
      setVentDeploye(true);
      setDonneeVentDeployee("vent");
    } else if (donneeVentDeployee === "vent") {
      setDonneeVentDeployee("ventDirection");
    } else {
      setVentDeploye(false);
    }
  }, [ventDeploye, donneeVentDeployee]);

  const celluleActive = useMemo(() => {
    if (!cellulesMeteoState.length || !pointActif) return null;
    return trouverCelluleActive(cellulesMeteoState, pointActif.timestamp, pointActif.lat, pointActif.lon);
  }, [cellulesMeteoState, pointActif]);

  return (
    <div style={{ "--hauteur-graphique": `${paddingBas}px`, "--accent-nav": ACCENT_PAR_TYPE[type] ?? "var(--accent)" } as React.CSSProperties}>
      {/* Squiggle + breadcrumb + panneau stats */}
      <div className="trace-vue-stats-wrapper">
        {!statsReduit && (
          <div className="navigation-breadcrumb-flottant">
            {breadcrumb.includes(" > ") ? (
              <>
                <span className="breadcrumb-dossier">{breadcrumb.split(" > ")[0]}</span>
                <span className="breadcrumb-ellipsis">...</span>
                {" > "}
                {breadcrumb.split(" > ").slice(1).join(" > ")}
              </>
            ) : breadcrumb}
          </div>
        )}
        <div className="trace-vue-stats">
        <div className="navigation-meta">
          {enEditionNom ? (
            <input
              className="titre-editable-input"
              value={nomEdite}
              onChange={(e) => setNomEdite(e.target.value)}
              onBlur={sauvegarderNom}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sauvegarderNom();
                }
                if (e.key === "Escape") {
                  setNomEdite(nom);
                  setEnEditionNom(false);
                }
              }}
              autoFocus
            />
          ) : (
            <div className="navigation-nom-ligne">
              <h2
                className="navigation-nom titre-editable"
                onClick={() => setEnEditionNom(true)}
                title="Cliquer pour renommer"
              >
                {nom}
              </h2>
              <span className="navigation-badge-type">{LABEL_TYPE[type] ?? type}</span>
            </div>
          )}
          <div className="navigation-meta-details" style={statsReduit ? { display: "none" } : undefined}>
            <span
              className="navigation-date-texte"
              onClick={() => dateInputRef.current?.showPicker()}
            >
              {dateEditee ? format(new Date(dateEditee), "dd/MM/yyyy", { locale: fr }) : "—"}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              className="navigation-date-input-hidden"
              value={dateEditee}
              onChange={handleChangeDate}
              tabIndex={-1}
            />
            {bateau && (
              <div className="navigation-bateau">
                <svg width="10" height="16" viewBox="0 0 12 22" fill="none" style={{ transform: "rotate(30deg)" }}>
                  <path d="M6 0 Q12 8 11 16 L10 20 L2 20 L1 16 Q0 8 6 0 Z" fill="var(--accent-nav)" stroke="white" strokeWidth="1" />
                </svg>
                <span style={{ color: "var(--accent-nav)" }}>{bateau.nom}</span>
              </div>
            )}
            <button
              className="navigation-ajouter-bateau"
              title="Ajouter un concurrent (bientot)"
            >
              +
            </button>
          </div>
        </div>
        <PanneauStats
          distanceNm={distanceNm}
          durationSeconds={durationSeconds}
          avgSpeedKn={avgSpeedKn}
          maxSpeedKn={maxSpeedKn}
          traceId={traceId}
          statsVent={statsVentState}
          traceTimestamps={traceTimestamps}
          traceTropRecente={traceTropRecente}
          onMeteoChargee={handleMeteoChargee}
          onMeteoSupprimee={handleMeteoSupprimee}
          onReduitChange={setStatsReduit}
        />
      </div>
      </div>

      {pointActif && (
        <div className="trace-vue-point-actif">
          <PanneauPointActif
            pointActif={pointActif}
            donneeGraphee={donneeGraphee}
            onChangeDonneeGraphee={setDonneeGraphee}
            capDisponible={capDisponible}
            celluleActive={celluleActive}
          />
        </div>
      )}

      <div className="trace-vue-carte">
        <TraceMapWrapper
          points={points}
          maxSpeed={maxSpeed}
          paddingBottom={paddingBas}
          pointActifIndex={pointActifIndex}
          pointFixeIndex={pointFixeIndex}
          onHoverPoint={handleHoverPoint}
          onClickPoint={handleClickPoint}
          cellulesMeteo={cellulesMeteoState}
          statsVent={statsVentState}
          donneeGraphee={donneeGraphee}
          ventDeploye={ventDeploye}
          donneeVentDeployee={donneeVentDeployee}
          onClickRoseDesVents={handleClickRoseDesVents}
          onBearingChange={setMapBearing}
        />
      </div>

      {statsVentState && (
        <div className="trace-vue-vent">
          {ventDeploye ? (
            <>
              <div className="hud-vent-deploye">
                <span className="hud-vent-deploye-titre">
                  {donneeVentDeployee === "vent" ? "Vent (kt)" : "Direction vent (°)"}
                </span>
                <div className="hud-vent-deploye-graphique">
                  <TraceChart
                    points={points}
                    donnee={donneeVentDeployee}
                    pointActifIndex={pointActifIndex}
                    pointFixeIndex={pointFixeIndex}
                    onHoverPoint={handleHoverPoint}
                    onClickPoint={handleClickPoint}
                    cellulesMeteo={cellulesMeteoState}
                    compact
                  />
                </div>
              </div>
              <RoseDesVents
                celluleActive={celluleActive}
                statsVent={statsVentState}
                ventDeploye={ventDeploye}
                donneeVentDeployee={donneeVentDeployee}
                mapBearing={mapBearing}
                onClick={handleClickRoseDesVents}
              />
            </>
          ) : (
            <RoseDesVents
              celluleActive={celluleActive}
              statsVent={statsVentState}
              ventDeploye={ventDeploye}
              donneeVentDeployee={donneeVentDeployee}
              mapBearing={mapBearing}
              onClick={handleClickRoseDesVents}
            />
          )}
        </div>
      )}

      {/* Graphique + timeline */}
      <div className="trace-vue-graphique">
        <GraphiqueRedimensionnable
          hauteurInitiale={HAUTEUR_GRAPHIQUE_INITIALE}
          hauteurMin={80}
          hauteurMax={450}
          onHauteurChange={handleHauteurChange}
        >
          <TraceChart
            points={points}
            donnee={donneeGraphee}
            pointActifIndex={pointActifIndex}
            pointFixeIndex={pointFixeIndex}
            onHoverPoint={handleHoverPoint}
            onClickPoint={handleClickPoint}
            cellulesMeteo={cellulesMeteoState}
          />
        </GraphiqueRedimensionnable>
      </div>

    </div>
  );
}
