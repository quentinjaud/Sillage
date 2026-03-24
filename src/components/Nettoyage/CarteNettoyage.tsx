"use client";

import { useCallback, useMemo, useRef } from "react";
import MapGL, {
  Source,
  Layer,
  Marker,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PointNettoyage } from "@/lib/types";
import { COULEURS } from "@/lib/theme";
import { creerStyleCarte } from "@/lib/maps/style-carte";

interface PropsCarteNettoyage {
  points: PointNettoyage[];
  selectionIndices: Set<number>;
  pointSurvole: number | null;
  onClickPoint: (pointIndex: number) => void;
  onHoverPoint: (pointIndex: number | null) => void;
}

export default function CarteNettoyage({
  points,
  selectionIndices,
  pointSurvole,
  onClickPoint,
  onHoverPoint,
}: PropsCarteNettoyage) {
  const mapRef = useRef<MapRef>(null);

  const limites = useMemo(() => {
    const lons = points.map((p) => p.lon);
    const lats = points.map((p) => p.lat);
    return [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [points]);

  const styleCarte = useMemo(() => creerStyleCarte(), []);

  // Point survolé depuis le graphique
  const pointSurvoleData = useMemo(() => {
    if (pointSurvole === null) return null;
    return points.find((p) => p.pointIndex === pointSurvole) ?? null;
  }, [points, pointSurvole]);

  // GeoJSON : ligne de la trace (points non-exclus)
  const geojsonLigne = useMemo(() => {
    const coords = points
      .filter((p) => !p.isExcluded)
      .map((p) => [p.lon, p.lat]);
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: coords },
      properties: {},
    };
  }, [points]);

  // GeoJSON : tous les points comme cercles (pour interaction)
  const geojsonPoints = useMemo(() => {
    const features = points.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [p.lon, p.lat],
      },
      properties: {
        pointIndex: p.pointIndex,
        isExcluded: p.isExcluded,
        isAberrant: p.typeAberrant !== null,
        isSelected: selectionIndices.has(p.pointIndex),
        isSurvole: p.pointIndex === pointSurvole,
      },
    }));
    return { type: "FeatureCollection" as const, features };
  }, [points, selectionIndices, pointSurvole]);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features;
      if (features && features.length > 0) {
        const pointIndex = features[0].properties?.pointIndex as number;
        if (pointIndex !== undefined) {
          onClickPoint(pointIndex);
        }
      }
    },
    [onClickPoint]
  );

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features;
      if (features && features.length > 0) {
        const pointIndex = features[0].properties?.pointIndex as number;
        onHoverPoint(pointIndex ?? null);
      } else {
        onHoverPoint(null);
      }
    },
    [onHoverPoint]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverPoint(null);
  }, [onHoverPoint]);

  if (points.length === 0) {
    return (
      <div className="map-loading">
        <p className="map-loading-text">Aucun point à afficher</p>
      </div>
    );
  }

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{
        bounds: limites,
        fitBoundsOptions: { padding: 60 },
      }}
      mapStyle={styleCarte}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      interactiveLayerIds={[
        "nettoyage-points-normaux",
        "nettoyage-points-exclus",
        "nettoyage-points-aberrants",
      ]}
      cursor="pointer"
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="bottom-left" />

      {/* Ligne de la trace (points non-exclus) */}
      <Source id="trace-ligne" type="geojson" data={geojsonLigne}>
        <Layer
          id="nettoyage-ligne"
          type="line"
          paint={{
            "line-color": COULEURS.accent,
            "line-width": 2.5,
            "line-opacity": 0.7,
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
      </Source>

      {/* Points interactifs — ordre = z-index : exclus (dessous) → aberrants → normaux (dessus) */}
      <Source id="trace-points" type="geojson" data={geojsonPoints}>
        {/* Points exclus (gris, petits, en dessous) */}
        <Layer
          id="nettoyage-points-exclus"
          type="circle"
          filter={[
            "all",
            ["==", "isExcluded", true],
            ["==", "isAberrant", false],
          ]}
          paint={{
            "circle-radius": [
              "case",
              ["==", ["get", "isSurvole"], true],
              5,
              2,
            ],
            "circle-color": COULEURS.texteLeger,
            "circle-opacity": 0.3,
            "circle-stroke-width": [
              "case",
              ["==", ["get", "isSelected"], true],
              2,
              0,
            ],
            "circle-stroke-color": COULEURS.jaune,
          }}
        />

        {/* Points aberrants (détectés mais pas forcément exclus) */}
        <Layer
          id="nettoyage-points-aberrants"
          type="circle"
          filter={["==", "isAberrant", true]}
          paint={{
            "circle-radius": [
              "case",
              ["==", ["get", "isSurvole"], true],
              10,
              6,
            ],
            "circle-color": COULEURS.danger,
            "circle-opacity": [
              "case",
              ["==", ["get", "isExcluded"], true],
              0.4,
              0.9,
            ],
            "circle-stroke-width": [
              "case",
              ["==", ["get", "isSelected"], true],
              3,
              1.5,
            ],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "isSelected"], true],
              COULEURS.jaune,
              COULEURS.danger,
            ],
          }}
        />

        {/* Points normaux (non-exclus, au-dessus de tout) */}
        <Layer
          id="nettoyage-points-normaux"
          type="circle"
          filter={[
            "all",
            ["==", "isExcluded", false],
            ["==", "isAberrant", false],
          ]}
          paint={{
            "circle-radius": [
              "case",
              ["==", ["get", "isSurvole"], true],
              8,
              4,
            ],
            "circle-color": COULEURS.accent,
            "circle-opacity": 0.8,
            "circle-stroke-width": 0,
          }}
        />
      </Source>

      {/* Marqueur de survol synchronisé */}
      {pointSurvoleData && (
        <Marker
          longitude={pointSurvoleData.lon}
          latitude={pointSurvoleData.lat}
          anchor="center"
        >
          <div className="nettoyage-curseur-sync" />
        </Marker>
      )}
    </MapGL>
  );
}
