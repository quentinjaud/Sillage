"use client";

import { useEffect, useState, useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

/** Largeur max de la barre d'échelle en px */
const LARGEUR_MAX = 100;

function metresParPixel(lat: number, zoom: number): number {
  return (Math.cos((lat * Math.PI) / 180) * 40075016.686) / Math.pow(2, zoom + 8);
}

/** Plus grand palier <= valeur (arrondi vers le bas pour rester dans la largeur max) */
function valeurPropre(valeur: number): number {
  const paliers = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  let result = paliers[0];
  for (const p of paliers) {
    if (p <= valeur) result = p;
    else break;
  }
  return result;
}

interface PropsEchelle {
  mapRef: React.RefObject<MapRef | null>;
}

export default function EchelleCarte({ mapRef }: PropsEchelle) {
  const [echelle, setEchelle] = useState<{ texte: string; largeur: number } | null>(null);

  const mettreAJour = useCallback(() => {
    const carte = mapRef.current?.getMap();
    if (!carte) return;

    const centre = carte.getCenter();
    const zoom = carte.getZoom();
    const mpp = metresParPixel(centre.lat, zoom);
    const distMaxMetres = mpp * LARGEUR_MAX;
    const distMaxNm = distMaxMetres / 1852;

    let texte: string;
    let distMetres: number;

    if (distMaxNm >= 0.3) {
      const nmPropre = valeurPropre(distMaxNm * 10) / 10;
      const nmFinal = nmPropre >= 1 ? Math.round(nmPropre) : nmPropre;
      distMetres = nmFinal * 1852;
      texte = `${nmFinal} NM`;
    } else {
      const mPropre = valeurPropre(distMaxMetres);
      distMetres = mPropre;
      texte = mPropre >= 1000 ? `${mPropre / 1000} km` : `${mPropre} m`;
    }

    const largeur = Math.round(distMetres / mpp);
    setEchelle({ texte, largeur: Math.min(largeur, LARGEUR_MAX) });
  }, [mapRef]);

  useEffect(() => {
    // Attendre que la carte soit prête
    const interval = setInterval(() => {
      const carte = mapRef.current?.getMap();
      if (carte) {
        clearInterval(interval);
        mettreAJour();
        carte.on("zoom", mettreAJour);
        carte.on("move", mettreAJour);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      const carte = mapRef.current?.getMap();
      if (carte) {
        carte.off("zoom", mettreAJour);
        carte.off("move", mettreAJour);
      }
    };
  }, [mapRef, mettreAJour]);

  if (!echelle) return null;

  return (
    <div className="echelle-carte">
      <div className="echelle-barre" style={{ width: echelle.largeur }} />
      <span className="echelle-texte">{echelle.texte}</span>
    </div>
  );
}
