"use client";

import { Marker } from "react-map-gl/maplibre";
import { snapperVersPointProche } from "@/lib/pointsSnap";
import type { ResumeDossier } from "@/lib/types";

interface PropsMarqueurDossier {
  dossier: ResumeDossier;
  actif: boolean;
  onClick: (dossierId: string) => void;
  onDragEnd?: (dossierId: string, lat: number, lon: number) => void;
}

export default function MarqueurDossier({
  dossier,
  actif,
  onClick,
  onDragEnd,
}: PropsMarqueurDossier) {
  if (dossier.markerLat == null || dossier.markerLon == null) return null;

  const total = dossier.nbSousDossiers + dossier.nbNavigations;

  return (
    <Marker
      latitude={dossier.markerLat}
      longitude={dossier.markerLon}
      anchor="bottom"
      draggable={!!onDragEnd}
      onDragEnd={(e) => {
        if (!onDragEnd) return;
        onDragEnd(dossier.id, e.lngLat.lat, e.lngLat.lng);
      }}
    >
      <button
        className={`marqueur-dossier ${actif ? "marqueur-dossier-actif" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(dossier.id);
        }}
      >
        <span className="marqueur-dossier-nom">{dossier.nom}</span>
        {total > 0 && (
          <span className="marqueur-dossier-count">{total}</span>
        )}
      </button>
    </Marker>
  );
}
