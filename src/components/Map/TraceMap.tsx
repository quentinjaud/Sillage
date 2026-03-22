"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import MapGL, {
  Source,
  Layer,
  Popup,
  Marker,
} from "react-map-gl/maplibre";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Layers, Map as MapIcon, Satellite, Ship, Plus, Minus, Compass } from "lucide-react";
import EchelleCarte from "./EchelleCarte";
import type { PointCarte } from "@/lib/types";

interface PropsCarteTrace {
  points: PointCarte[];
  maxSpeed: number;
  paddingBottom?: number;
  pointActifIndex?: number | null;
  onHoverPoint?: (pointIndex: number | null) => void;
}

import {
  calculerStatsVitesse,
  vitesseVersCouleur,
} from "@/lib/geo/couleur-vitesse";

/** Style MapLibre avec OSM, Satellite et OpenSeaMap */
function creerStyleCarte(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      },
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "&copy; Esri",
      },
      openseamap: {
        type: "raster",
        tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        layout: { visibility: "visible" },
      },
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        layout: { visibility: "none" },
      },
      {
        id: "openseamap",
        type: "raster",
        source: "openseamap",
        paint: { "raster-opacity": 0.8 },
        layout: { visibility: "visible" },
      },
    ],
  };
}

interface InfoPopup {
  lon: number;
  lat: number;
  vitesse: number;
  cap: number | null;
  heure: string | null;
}

export default function TraceMap({ points, maxSpeed, paddingBottom = 40, pointActifIndex, onHoverPoint }: PropsCarteTrace) {
  const mapRef = useRef<MapRef>(null);
  const [fondCarte, setFondCarte] = useState<"osm" | "satellite">("osm");
  const [afficherSeaMap, setAfficherSeaMap] = useState(true);
  const [popupInfo, setPopupInfo] = useState<InfoPopup | null>(null);
  const [panneauCouchesOuvert, setPanneauCouchesOuvert] = useState(false);

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

  const styleCarte = useMemo(() => creerStyleCarte(), []);

  const basculerFond = useCallback(
    (fond: "osm" | "satellite") => {
      const carte = mapRef.current?.getMap();
      if (!carte) return;
      carte.setLayoutProperty(
        "osm",
        "visibility",
        fond === "osm" ? "visible" : "none"
      );
      carte.setLayoutProperty(
        "satellite",
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
      "openseamap",
      "visibility",
      actif ? "visible" : "none"
    );
    setAfficherSeaMap(actif);
  }, []);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const features = event.features;
    if (features && features.length > 0) {
      const f = features[0];
      setPopupInfo({
        lon: event.lngLat.lng,
        lat: event.lngLat.lat,
        vitesse: (f.properties?.vitesse as number) ?? 0,
        cap: (f.properties?.cap as number) ?? null,
        heure: (f.properties?.heure as string) ?? null,
      });
    } else {
      setPopupInfo(null);
    }
  }, []);

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
        cursor="pointer"
        style={{ width: "100%", height: "100%" }}
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
                <p>
                  <strong>Heure :</strong>{" "}
                  {format(new Date(popupInfo.heure), "HH:mm:ss", {
                    locale: fr,
                  })}
                </p>
              )}
              <p>
                <strong>Vitesse :</strong> {popupInfo.vitesse.toFixed(1)} kn
              </p>
              {popupInfo.cap !== null && (
                <p>
                  <strong>Cap :</strong> {Math.round(popupInfo.cap)}°
                </p>
              )}
              <p className="map-popup-coords">
                {popupInfo.lat.toFixed(5)}, {popupInfo.lon.toFixed(5)}
              </p>
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
                transform: `rotate(${pointActifData.headingDeg ?? 0}deg)`,
              }}
            >
              <svg
                width="20"
                height="30"
                viewBox="0 0 20 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 0 L18 24 Q10 30 2 24 Z"
                  fill="#F6BC00"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </Marker>
        )}
      </MapGL>

      {/* Contrôles carte — boutons ronds en haut à droite */}
      <div className="map-couches-btns">
        <button
          className="map-couche-btn"
          onClick={() => mapRef.current?.getMap().zoomIn()}
          title="Zoom avant"
        >
          <Plus style={{ width: 14, height: 14 }} />
        </button>
        <button
          className="map-couche-btn"
          onClick={() => mapRef.current?.getMap().zoomOut()}
          title="Zoom arrière"
        >
          <Minus style={{ width: 14, height: 14 }} />
        </button>
        <button
          className="map-couche-btn"
          onClick={() => mapRef.current?.getMap().resetNorthPitch()}
          title="Réinitialiser le nord"
        >
          <Compass style={{ width: 14, height: 14 }} />
        </button>

        <div className="map-couche-spacer" />

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

      <EchelleCarte mapRef={mapRef} />
    </div>
  );
}
