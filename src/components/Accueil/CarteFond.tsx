"use client";

import { useMemo, useRef, type ReactNode } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { creerStyleCarte } from "@/lib/maps/style-carte";

interface PropsCarteFond {
  children?: ReactNode;
}

const VUE_INITIALE = {
  latitude: 47.5,
  longitude: -3.0,
  zoom: 7,
} as const;

export default function CarteFond({ children }: PropsCarteFond) {
  const mapRef = useRef<MapRef>(null);
  const styleCarte = useMemo(
    () => creerStyleCarte({ desaturation: true, openseamap: false }),
    []
  );

  return (
    <div className="carte-fond-container">
      <Map
        ref={mapRef}
        initialViewState={VUE_INITIALE}
        mapStyle={styleCarte}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {children}
      </Map>
    </div>
  );
}
