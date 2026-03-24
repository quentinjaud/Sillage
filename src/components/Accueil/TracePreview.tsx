"use client";

import { useMemo, useEffect } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import type { ResumeNavigation } from "@/lib/types";

interface PropsTracePreview {
  navigation: ResumeNavigation;
}

const COULEURS_TRACE: Record<string, string> = {
  SOLO: "#43728B",
  AVENTURE: "#C45B3E",
  REGATE: "#F6BC00",
};

export default function TracePreview({ navigation }: PropsTracePreview) {
  const { current: map } = useMap();

  const polyline =
    navigation.polylineCache ?? navigation.trace?.polylineSimplifiee;

  const geojson = useMemo(() => {
    if (!polyline || !Array.isArray(polyline) || polyline.length < 2)
      return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        // polylineSimplifiee est deja en [lon, lat] (format GeoJSON)
        coordinates: polyline as [number, number][],
      },
    };
  }, [polyline]);

  // Centrer la carte sur la trace
  useEffect(() => {
    if (!geojson || !map || !map.getStyle()) return;
    const coords = geojson.geometry.coordinates;
    if (coords.length === 0) return;

    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    // Padding pour laisser de la place au panneau lateral gauche
    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: { top: 60, right: 60, bottom: 60, left: 360 }, duration: 800 }
    );
  }, [geojson, map]);

  if (!geojson) return null;

  const couleur = COULEURS_TRACE[navigation.type] ?? "#43728B";

  return (
    <Source id="trace-preview" type="geojson" data={geojson}>
      <Layer
        id="trace-preview-line"
        type="line"
        paint={{
          "line-color": couleur,
          "line-width": 3,
          "line-opacity": 0.8,
        }}
      />
    </Source>
  );
}
