"use client";

import { useCallback, useMemo, useState } from "react";
import TraceMapWrapper from "@/components/Map/TraceMapWrapper";
import TraceChart from "@/components/Stats/TraceChart";
import PanneauStats from "@/components/Stats/PanneauStats";
import PanneauPointActif from "@/components/Stats/PanneauPointActif";
import GraphiqueRedimensionnable from "@/components/Stats/GraphiqueRedimensionnable";
import RoseDesVents from "@/components/Map/RoseDesVents";
import { trouverCelluleActive } from "@/lib/geo/stats-vent";
import type { PointCarte, CelluleMeteoClient, StatsVent } from "@/lib/types";
import { useEtatVue, HAUTEUR_GRAPHIQUE_INITIALE } from "@/lib/hooks/useEtatVue";

interface PropsTraceVueClient {
  traceId: string;
  points: PointCarte[];
  maxSpeed: number;
  distanceNm: number | null;
  durationSeconds: number | null;
  avgSpeedKn: number | null;
  maxSpeedKn: number | null;
  cellulesMeteo?: CelluleMeteoClient[];
  statsVent?: StatsVent | null;
  traceTimestamps?: boolean;
  traceTropRecente?: boolean;
}

export default function TraceVueClient({
  traceId,
  points,
  maxSpeed,
  distanceNm,
  durationSeconds,
  avgSpeedKn,
  maxSpeedKn,
  cellulesMeteo,
  statsVent,
  traceTimestamps,
  traceTropRecente,
}: PropsTraceVueClient) {
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

  const [cellulesMeteoState, setCellulesMeteoState] = useState(cellulesMeteo ?? []);
  const [statsVentState, setStatsVentState] = useState(statsVent ?? null);
  const [mapBearing, setMapBearing] = useState(0);

  const handleMeteoChargee = useCallback(
    (data: { statsVent: StatsVent; cellules: CelluleMeteoClient[] }) => {
      setStatsVentState(data.statsVent);
      setCellulesMeteoState(data.cellules);
    },
    []
  );

  const [ventDeploye, setVentDeploye] = useState(false);
  const [donneeVentDeployee, setDonneeVentDeployee] = useState<"vent" | "ventDirection">("vent");

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
    <div style={{ "--hauteur-graphique": `${paddingBas}px` } as React.CSSProperties}>
      <div className="trace-vue-stats-wrapper">
        <svg className="trace-vue-squiggle" width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="sq-grad-t" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#43728B" />
              <stop offset="20%" stopColor="#43728B" />
              <stop offset="50%" stopColor="#D32F2F" />
              <stop offset="80%" stopColor="#F6BC00" />
              <stop offset="100%" stopColor="#F6BC00" />
            </linearGradient>
          </defs>
          <path d="M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 3.5c5-2 7 2.5 3 4C1.5 10 2 15 5 16c5 2 9-10 14-7s.5 13.5-4 12c-5-2.5.5-11 6-2" stroke="url(#sq-grad-t)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="trace-vue-stats">
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
