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
import { useZoomTemporel } from "@/lib/hooks/useZoomTemporel";
import BarreOutils from "@/components/BarreOutils";
import { Eraser, Pencil, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";

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

  const {
    debutZoom, finZoom, isZoomed, pointsFiltres,
    setPlage, resetZoom,
  } = useZoomTemporel(points);

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

  const routeur = useRouter();

  return (
    <div style={{ "--hauteur-graphique": `${paddingBas}px` } as React.CSSProperties}>
      <div className="trace-vue-stats-wrapper">
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
        <BarreOutils
          actions={[
            {
              id: "nettoyer",
              icone: <Eraser />,
              label: "Nettoyer la trace",
              onClick: () => routeur.push(`/trace/${traceId}/nettoyage`),
            },
            {
              id: "editer",
              icone: <Pencil />,
              label: "Editer la trace",
              onClick: () => { /* TODO: popover edition */ },
            },
            {
              id: "lier-nav",
              icone: <Link2 />,
              label: "Lier a une navigation",
              onClick: () => { /* TODO: creer/associer navigation */ },
            },
          ]}
        />
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
          points={isZoomed ? pointsFiltres : points}
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
            rangeDebut={debutZoom}
            rangeFin={finZoom}
            onRangeChange={setPlage}
            onRangeReset={resetZoom}
          />
        </GraphiqueRedimensionnable>
      </div>

    </div>
  );
}
