"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { creerStyleCarte } from "@/lib/maps/style-carte";
import { usePanneau } from "@/lib/contexts/PanneauContext";
import { Anchor } from "lucide-react";

interface PropsCarteFond {
  children?: ReactNode;
  /** Centre initial depuis le port d'attache (optionnel) */
  centreLat?: number;
  centreLon?: number;
  /** Port d'attache pour afficher le marqueur */
  portAttacheLat?: number | null;
  portAttacheLon?: number | null;
}

export default function CarteFond({
  children,
  centreLat,
  centreLon,
  portAttacheLat: portAttacheLatProp,
  portAttacheLon: portAttacheLonProp,
}: PropsCarteFond) {
  const mapRef = useRef<MapRef>(null);
  const { modePortAttache, setModePortAttache } = usePanneau();
  // Etat local pour maj immediat du marqueur apres clic (sans attendre refresh serveur)
  const [portLocal, setPortLocal] = useState<{ lat: number; lon: number } | null>(null);
  const portAttacheLat = portLocal?.lat ?? portAttacheLatProp;
  const portAttacheLon = portLocal?.lon ?? portAttacheLonProp;

  // Ref pour acceder a la valeur courante de modePortAttache dans le handler
  // (react-map-gl ne re-bind pas toujours onClick quand la ref change)
  const modePortAttacheRef = useRef(modePortAttache);
  modePortAttacheRef.current = modePortAttache;

  const styleCarte = useMemo(
    () => creerStyleCarte({ desaturation: true, openseamap: false }),
    []
  );

  const vueInitiale = useMemo(
    () => ({
      latitude: centreLat ?? 47.5,
      longitude: centreLon ?? -3.0,
      zoom: 7,
    }),
    [centreLat, centreLon]
  );

  const handleClick = useCallback(
    async (e: MapLayerMouseEvent) => {
      if (!modePortAttacheRef.current) return;

      const { lat, lng } = e.lngLat;
      // Maj locale immediate
      setPortLocal({ lat, lon: lng });
      setModePortAttache(false);

      try {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portAttacheLat: lat,
            portAttacheLon: lng,
          }),
        });
      } catch {
        // rollback si erreur
        setPortLocal(null);
      }
    },
    [setModePortAttache]
  );

  return (
    <div
      className="carte-fond-container"
      style={modePortAttache ? { cursor: "crosshair" } : undefined}
    >
      <Map
        ref={mapRef}
        initialViewState={vueInitiale}
        mapStyle={styleCarte}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        onClick={handleClick}
      >
        {/* Marqueur port d'attache */}
        {portAttacheLat != null && portAttacheLon != null && (
          <Marker latitude={portAttacheLat} longitude={portAttacheLon}>
            <div className="marqueur-port-attache" title="Mon port d'attache">
              <Anchor size={16} />
            </div>
          </Marker>
        )}
        {children}
      </Map>
    </div>
  );
}
