"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import MapGL, {
  Source,
  Layer,
  Popup,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PointCarte {
  lat: number;
  lon: number;
  timestamp: string | null;
  speedKn: number | null;
  headingDeg: number | null;
  pointIndex: number;
}

interface PropsCarteTrace {
  points: PointCarte[];
  maxSpeed: number;
}

/** Calcule la moyenne et l'écart-type des vitesses non-null */
function calculerStatsVitesse(points: PointCarte[]): {
  moyenne: number;
  ecartType: number;
} {
  const vitesses = points
    .map((p) => p.speedKn)
    .filter((v): v is number => v !== null && v > 0);
  if (vitesses.length === 0) return { moyenne: 0, ecartType: 1 };

  const moyenne = vitesses.reduce((a, b) => a + b, 0) / vitesses.length;
  if (!isFinite(moyenne)) return { moyenne: 0, ecartType: 1 };
  const variance =
    vitesses.reduce((s, v) => s + (v - moyenne) ** 2, 0) / vitesses.length;
  const ecartType = Math.sqrt(variance) || 1;

  return { moyenne, ecartType };
}

/**
 * Convertit une vitesse en couleur (bleu=lent → rouge=rapide).
 * Échelle relative centrée sur la moyenne ± 2 écarts-types :
 * les variations locales de vitesse ressortent bien visuellement,
 * même quand la plage absolue est faible.
 */
function vitesseVersCouleur(
  vitesse: number,
  moyenne: number,
  ecartType: number
): string {
  const min = Math.max(0, moyenne - 2 * ecartType);
  const max = moyenne + 2 * ecartType;
  const plage = max - min;
  if (!plage || !isFinite(plage) || !isFinite(vitesse)) {
    return "hsl(240, 100%, 50%)";
  }
  const ratio = Math.max(0, Math.min((vitesse - min) / plage, 1));
  const teinte = Math.round(240 - ratio * 240);
  return `hsl(${teinte}, 100%, 50%)`;
}

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

export default function TraceMap({ points, maxSpeed }: PropsCarteTrace) {
  const mapRef = useRef<MapRef>(null);
  const [fondCarte, setFondCarte] = useState<"osm" | "satellite">("osm");
  const [afficherSeaMap, setAfficherSeaMap] = useState(true);
  const [popupInfo, setPopupInfo] = useState<InfoPopup | null>(null);

  // Guard : pas de points → message au lieu d'un crash
  if (points.length === 0) {
    return (
      <div className="map-loading">
        <p className="map-loading-text">Aucun point à afficher</p>
      </div>
    );
  }

  const limites = useMemo(() => {
    const lons = points.map((p) => p.lon);
    const lats = points.map((p) => p.lat);
    return [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points]);

  // Stats de vitesse pour le gradient relatif
  const statsVitesse = useMemo(() => calculerStatsVitesse(points), [points]);

  // Ligne continue unique avec gradient de couleur par vitesse
  const { geojsonLigne, gradientExpression } = useMemo(() => {
    const { moyenne, ecartType } = statsVitesse;
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
      stops.push(progress, vitesseVersCouleur(vitesse, moyenne, ecartType));
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

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <MapGL
        ref={mapRef}
        initialViewState={{
          bounds: limites,
          fitBoundsOptions: { padding: 40 },
        }}
        mapStyle={styleCarte}
        onClick={handleClick}
        interactiveLayerIds={["trace-segments"]}
        cursor="pointer"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-left" />

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
      </MapGL>

      {/* Contrôle de couches */}
      <div className="map-layer-control">
        <label className="map-layer-radio">
          <input
            type="radio"
            name="fond-carte"
            checked={fondCarte === "osm"}
            onChange={() => basculerFond("osm")}
          />
          Carte
        </label>
        <label className="map-layer-radio">
          <input
            type="radio"
            name="fond-carte"
            checked={fondCarte === "satellite"}
            onChange={() => basculerFond("satellite")}
          />
          Satellite
        </label>
        <hr className="map-layer-separator" />
        <label className="map-layer-checkbox">
          <input
            type="checkbox"
            checked={afficherSeaMap}
            onChange={(e) => basculerSeaMap(e.target.checked)}
          />
          OpenSeaMap
        </label>
      </div>
    </div>
  );
}
