"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, {
  Source,
  Layer,
  Popup,
  Marker,
} from "react-map-gl/maplibre";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Layers, Map as MapIcon, Satellite, Ship, Plus, Minus, Compass, Wind, Gauge, Clock, MapPin } from "lucide-react";
import EchelleCarte from "./EchelleCarte";
import { trouverCelluleActive } from "@/lib/geo/stats-vent";
import type { PointCarte, CelluleMeteoClient, StatsVent, DonneeGraphee } from "@/lib/types";

interface PropsCarteTrace {
  points: PointCarte[];
  maxSpeed: number;
  paddingBottom?: number;
  pointActifIndex?: number | null;
  pointFixeIndex?: number | null;
  onHoverPoint?: (pointIndex: number | null) => void;
  onClickPoint?: (pointIndex: number) => void;
  cellulesMeteo?: CelluleMeteoClient[];
  statsVent?: StatsVent | null;
  donneeGraphee?: DonneeGraphee;
  ventDeploye?: boolean;
  donneeVentDeployee?: "vent" | "ventDirection";
  onClickRoseDesVents?: () => void;
  onBearingChange?: (bearing: number) => void;
}

import {
  calculerStatsVitesse,
  vitesseVersCouleur,
} from "@/lib/geo/couleur-vitesse";
import { creerStyleCarte } from "@/lib/maps/style-carte";
import {
  LAYER_OSM,
  LAYER_SATELLITE,
  LAYER_OPENSEAMAP,
  type FondCarte,
} from "@/lib/maps/layer-ids";

interface InfoPopup {
  lon: number;
  lat: number;
  vitesse: number;
  cap: number | null;
  heure: string | null;
}

function formaterCoord(decimal: number, positif: string, negatif: string): string {
  const signe = decimal >= 0 ? positif : negatif;
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minDec = (abs - deg) * 60;
  const min = Math.floor(minDec);
  const milliemes = Math.round((minDec - min) * 1000);
  return `${deg}°${String(min).padStart(2, "0")}'${String(milliemes).padStart(3, "0")}${signe}`;
}

export default function TraceMap({ points, maxSpeed, paddingBottom = 40, pointActifIndex, pointFixeIndex, onHoverPoint, onClickPoint, cellulesMeteo, statsVent, donneeGraphee, ventDeploye, donneeVentDeployee, onClickRoseDesVents, onBearingChange }: PropsCarteTrace) {
  const mapRef = useRef<MapRef>(null);
  const [fondCarte, setFondCarte] = useState<FondCarte>("osm");
  const [afficherSeaMap, setAfficherSeaMap] = useState(true);
  const [popupInfo, setPopupInfo] = useState<InfoPopup | null>(null);
  const [panneauCouchesOuvert, setPanneauCouchesOuvert] = useState(false);
  const [modeOrientation, setModeOrientation] = useState<"nord" | "vent">("nord");
  const [bearing, setBearing] = useState(0);
  const bearingRef = useRef(0);
  const [popoverBoussole, setPopoverBoussole] = useState(false);

  const limites = useMemo(() => {
    const lons = points.map((p) => p.lon);
    const lats = points.map((p) => p.lat);
    return [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points]);

  // Stats de vitesse pour le gradient relatif
  const statsVitesse = useMemo(
    () => calculerStatsVitesse(points.map((p) => p.speedKn)),
    [points]
  );

  // Ligne continue unique avec gradient de couleur par vitesse
  const { geojsonLigne, gradientExpression } = useMemo(() => {
    const coordinates = points.map((p) => [p.lon, p.lat]);

    // Calculer les distances cumulées pour le line-progress
    const distances: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].lon - points[i - 1].lon;
      const dy = points[i].lat - points[i - 1].lat;
      distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalDist = distances[distances.length - 1] || 1;

    // Construire l'expression gradient : ["interpolate", ["linear"], ["line-progress"], stop1, color1, ...]
    const stops: (number | string)[] = [];
    for (let i = 0; i < points.length; i++) {
      const progress = distances[i] / totalDist;
      const vitesse = points[i].speedKn ?? 0;
      stops.push(progress, vitesseVersCouleur(vitesse, statsVitesse));
    }

    return {
      geojsonLigne: {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
        properties: {},
      },
      gradientExpression: [
        "interpolate",
        ["linear"],
        ["line-progress"],
        ...stops,
      ],
    };
  }, [points, statsVitesse]);

  // Segments individuels invisibles pour les interactions (popups au clic)
  const geojsonSegments = useMemo(() => {
    const features = [];
    for (let i = 1; i < points.length; i++) {
      const precedent = points[i - 1];
      const courant = points[i];
      features.push({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [precedent.lon, precedent.lat],
            [courant.lon, courant.lat],
          ],
        },
        properties: {
          vitesse: courant.speedKn ?? 0,
          cap: courant.headingDeg,
          heure: courant.timestamp,
          segmentIndex: courant.pointIndex,
        },
      });
    }
    return { type: "FeatureCollection" as const, features };
  }, [points]);

  const styleCarte = useMemo(() => creerStyleCarte({ satellite: true }), []);

  const basculerFond = useCallback(
    (fond: FondCarte) => {
      const carte = mapRef.current?.getMap();
      if (!carte) return;
      carte.setLayoutProperty(
        LAYER_OSM,
        "visibility",
        fond === "osm" ? "visible" : "none"
      );
      carte.setLayoutProperty(
        LAYER_SATELLITE,
        "visibility",
        fond === "satellite" ? "visible" : "none"
      );
      setFondCarte(fond);
    },
    []
  );

  const basculerSeaMap = useCallback((actif: boolean) => {
    const carte = mapRef.current?.getMap();
    if (!carte) return;
    carte.setLayoutProperty(
      LAYER_OPENSEAMAP,
      "visibility",
      actif ? "visible" : "none"
    );
    setAfficherSeaMap(actif);
  }, []);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const features = event.features;
    if (features && features.length > 0) {
      const f = features[0];
      const idx = f.properties?.segmentIndex as number;
      setPopupInfo({
        lon: event.lngLat.lng,
        lat: event.lngLat.lat,
        vitesse: (f.properties?.vitesse as number) ?? 0,
        cap: (f.properties?.cap as number) ?? null,
        heure: (f.properties?.heure as string) ?? null,
      });
      if (idx !== undefined && onClickPoint) {
        onClickPoint(idx);
      }
    } else {
      setPopupInfo(null);
    }
  }, [onClickPoint]);

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      if (!onHoverPoint) return;
      const features = event.features;
      if (features && features.length > 0) {
        const idx = features[0].properties?.segmentIndex as number;
        if (idx !== undefined) onHoverPoint(idx);
      } else {
        onHoverPoint(null);
      }
    },
    [onHoverPoint]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint?.(null);
  }, [onHoverPoint]);

  // Point survolé depuis le graphique
  const pointActifData = useMemo(() => {
    if (pointActifIndex == null) return null;
    return points.find((p) => p.pointIndex === pointActifIndex) ?? null;
  }, [points, pointActifIndex]);

  // Cellule meteo active pour le point courant
  const celluleActive = useMemo(() => {
    if (!cellulesMeteo?.length || !pointActifData) return null;
    return trouverCelluleActive(
      cellulesMeteo,
      pointActifData.timestamp,
      pointActifData.lat,
      pointActifData.lon
    );
  }, [cellulesMeteo, pointActifData]);

  // Rotation dynamique de la carte quand le mode "vent" est actif
  useEffect(() => {
    if (modeOrientation !== "vent" || !celluleActive) return;
    mapRef.current?.rotateTo(celluleActive.ventDirectionDeg, { duration: 500 });
    bearingRef.current = celluleActive.ventDirectionDeg;
    setBearing(celluleActive.ventDirectionDeg);
    onBearingChange?.(celluleActive.ventDirectionDeg);
  }, [modeOrientation, celluleActive?.ventDirectionDeg, onBearingChange]);

  if (points.length === 0) {
    return (
      <div className="map-loading">
        <p className="map-loading-text">Aucun point à afficher</p>
      </div>
    );
  }

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <MapGL
        ref={mapRef}
        initialViewState={{
          bounds: limites,
          fitBoundsOptions: { padding: { top: 40, left: 40, right: 40, bottom: paddingBottom } },
        }}
        mapStyle={styleCarte}
        onClick={handleClick}
        onMouseMove={onHoverPoint ? handleMouseMove : undefined}
        onMouseLeave={onHoverPoint ? handleMouseLeave : undefined}
        interactiveLayerIds={["trace-segments"]}
        pitchWithRotate={false}
        touchPitch={false}
        maxPitch={0}
        cursor="pointer"
        style={{ width: "100%", height: "100%" }}
        onMove={(e) => { const b = e.viewState.bearing; if (Math.abs(b - bearingRef.current) > 1) { bearingRef.current = b; setBearing(b); onBearingChange?.(b); } }}
        onRender={() => { const b = mapRef.current?.getBearing() ?? 0; if (Math.abs(b - bearingRef.current) > 1) { bearingRef.current = b; setBearing(b); onBearingChange?.(b); } }}
      >
        {/* Ligne continue avec gradient de couleur (rendu visuel) */}
        <Source
          id="trace-ligne"
          type="geojson"
          data={geojsonLigne}
          lineMetrics={true}
        >
          <Layer
            id="trace-line"
            type="line"
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
            paint={{
              "line-color": "blue",
              "line-gradient": gradientExpression as any,
              "line-width": 3,
              "line-opacity": 0.9,
            }}
          />
        </Source>

        {/* Segments invisibles pour les interactions (clic → popup) */}
        <Source id="trace-segments" type="geojson" data={geojsonSegments}>
          <Layer
            id="trace-segments"
            type="line"
            paint={{
              "line-color": "transparent",
              "line-width": 12,
              "line-opacity": 0,
            }}
          />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.lon}
            latitude={popupInfo.lat}
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div className="map-popup">
              {popupInfo.heure && (
                <div className="map-popup-ligne">
                  <Clock style={{ width: 11, height: 11 }} />
                  {format(new Date(popupInfo.heure), "dd MMM yyyy  HH:mm:ss", { locale: fr })}
                </div>
              )}
              <div className="map-popup-ligne">
                <MapPin style={{ width: 11, height: 11 }} />
                {formaterCoord(popupInfo.lat, "N", "S")} {formaterCoord(popupInfo.lon, "E", "W")}
              </div>
              <div className="map-popup-donnees">
                <span className="map-popup-donnee">
                  <Gauge style={{ width: 12, height: 12 }} />
                  {popupInfo.vitesse.toFixed(1)} kt
                </span>
                {popupInfo.cap !== null && (
                  <span className="map-popup-donnee">
                    <Compass style={{ width: 12, height: 12 }} />
                    {Math.round(popupInfo.cap)}°
                  </span>
                )}
              </div>
            </div>
          </Popup>
        )}

        {/* Marqueur directionnel — coque de bateau */}
        {pointActifData && (
          <Marker
            longitude={pointActifData.lon}
            latitude={pointActifData.lat}
            anchor="center"
          >
            <div
              className="marqueur-directionnel"
              style={{
                transform: `rotate(${(pointActifData.headingDeg ?? 0) - (mapRef.current?.getBearing() ?? 0)}deg)`,
              }}
            >
              <svg
                width="12"
                height="22"
                viewBox="0 0 12 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 0 Q12 8 11 16 L10 20 L2 20 L1 16 Q0 8 6 0 Z"
                  fill="#F6BC00"
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </Marker>
        )}
      </MapGL>

      {/* Indicateur vent sur la carte — uniquement en mode vent (le vent vient d'en haut) */}
      {statsVent && modeOrientation === "vent" && (
        <div className="map-indicateur-vent">
          <Wind size={60} />
        </div>
      )}

      {/* Contrôles carte — selecteurs en haut à droite */}
      <div className="map-couches-btns">
        {/* Orientation — selecteur style couches */}
        <div style={{ position: "relative" }}>
          <button
            className={`map-couche-btn map-couche-btn--layers${modeOrientation === "vent" || Math.abs(bearing) > 1 ? " map-couche-btn--actif" : ""}`}
            onClick={() => setPopoverBoussole((o) => !o)}
            title="Orientation de la carte"
          >
            {modeOrientation === "vent"
              ? <Wind style={{ width: 16, height: 16, transform: "rotate(90deg)" }} />
              : <Compass style={{ width: 16, height: 16, transform: `rotate(${-bearing}deg)`, transition: "transform 0.3s" }} />
            }
          </button>

          {popoverBoussole && (
            <div className="map-couches-panneau">
              <button
                className={`map-couche-option${modeOrientation === "nord" ? " active" : ""}`}
                onClick={() => {
                  setModeOrientation("nord");
                  mapRef.current?.resetNorthPitch();
                  bearingRef.current = 0;
                  setBearing(0);
                  onBearingChange?.(0);
                  setPopoverBoussole(false);
                }}
              >
                <Compass style={{ width: 16, height: 16 }} />
                Nord
              </button>
              <button
                className={`map-couche-option${modeOrientation === "vent" ? " active" : ""}${!statsVent ? " map-couche-option--desactive" : ""}`}
                onClick={() => {
                  if (!statsVent) return;
                  setModeOrientation("vent");
                  mapRef.current?.rotateTo(
                    celluleActive?.ventDirectionDeg ?? statsVent.directionMoyenneDeg,
                    { duration: 500 }
                  );
                  setPopoverBoussole(false);
                }}
                disabled={!statsVent}
                title={!statsVent ? "Aucune donnee meteo disponible" : "Orienter la carte face au vent"}
              >
                <Wind style={{ width: 16, height: 16 }} />
                Vent archive
              </button>
            </div>
          )}
        </div>


        {/* Couches — selecteur existant */}
        <div style={{ position: "relative" }}>
        <button
          className="map-couche-btn map-couche-btn--layers"
          onClick={() => setPanneauCouchesOuvert((o) => !o)}
          title="Couches"
        >
          <Layers style={{ width: 16, height: 16 }} />
        </button>

        {panneauCouchesOuvert && (
          <div className="map-couches-panneau">
            <button
              className={`map-couche-option${fondCarte === "osm" ? " active" : ""}`}
              onClick={() => basculerFond("osm")}
              title="Carte"
            >
              <MapIcon style={{ width: 16, height: 16 }} />
              Carte
            </button>
            <button
              className={`map-couche-option${fondCarte === "satellite" ? " active" : ""}`}
              onClick={() => basculerFond("satellite")}
              title="Satellite"
            >
              <Satellite style={{ width: 16, height: 16 }} />
              Satellite
            </button>
            <hr className="map-couche-sep" />
            <button
              className={`map-couche-option${afficherSeaMap ? " active" : ""}`}
              onClick={() => basculerSeaMap(!afficherSeaMap)}
              title="OpenSeaMap"
            >
              <Ship style={{ width: 16, height: 16 }} />
              SeaMap
            </button>
          </div>
        )}
        </div>
        <div className="map-zoom-pill">
          <button
            className="map-zoom-btn"
            onClick={() => mapRef.current?.getMap().zoomIn()}
            title="Zoom avant"
          >
            <Plus style={{ width: 14, height: 14 }} />
          </button>
          <button
            className="map-zoom-btn"
            onClick={() => mapRef.current?.getMap().zoomOut()}
            title="Zoom arriere"
          >
            <Minus style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Echelle — bas gauche */}
      <div className="map-bas-gauche">
        <EchelleCarte mapRef={mapRef} />
      </div>
    </div>
  );
}
