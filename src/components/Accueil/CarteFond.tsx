"use client";

import { useRef, type ReactNode } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface PropsCarteFond {
  children?: ReactNode;
}

const VUE_INITIALE = {
  latitude: 47.5,
  longitude: -3.0,
  zoom: 7,
} as const;

const STYLE_OSM = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm",
      paint: {
        "raster-saturation": -0.5,
        "raster-brightness-min": 0.15,
        "raster-contrast": -0.1,
      },
    },
  ],
};

export default function CarteFond({ children }: PropsCarteFond) {
  const mapRef = useRef<MapRef>(null);

  return (
    <div className="carte-fond-container">
      <Map
        ref={mapRef}
        initialViewState={VUE_INITIALE}
        mapStyle={STYLE_OSM}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {children}
      </Map>
    </div>
  );
}
