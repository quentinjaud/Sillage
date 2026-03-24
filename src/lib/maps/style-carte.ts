import type { StyleSpecification } from "maplibre-gl";
import {
  SOURCE_OSM,
  SOURCE_SATELLITE,
  SOURCE_OPENSEAMAP,
  LAYER_OSM,
  LAYER_SATELLITE,
  LAYER_OPENSEAMAP,
} from "./layer-ids";

interface OptionsStyleCarte {
  /** Inclure la source satellite Esri (default: false) */
  satellite?: boolean;
  /** Desaturer les tuiles OSM — style creme pour la carte d'accueil (default: false) */
  desaturation?: boolean;
  /** Inclure OpenSeaMap en overlay (default: true) */
  openseamap?: boolean;
}

/** Cree un style MapLibre avec OSM, Satellite (optionnel) et OpenSeaMap (optionnel) */
export function creerStyleCarte(options?: OptionsStyleCarte): StyleSpecification {
  const { satellite = false, desaturation = false, openseamap = true } = options ?? {};

  const sources: StyleSpecification["sources"] = {
    [SOURCE_OSM]: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    },
  };

  if (satellite) {
    sources[SOURCE_SATELLITE] = {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri",
    };
  }

  if (openseamap) {
    sources[SOURCE_OPENSEAMAP] = {
      type: "raster",
      tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
      tileSize: 256,
    };
  }

  const layers: StyleSpecification["layers"] = [
    {
      id: LAYER_OSM,
      type: "raster",
      source: SOURCE_OSM,
      ...(desaturation
        ? {
            paint: {
              "raster-saturation": -0.5,
              "raster-brightness-min": 0.15,
              "raster-contrast": -0.1,
            },
          }
        : {}),
    },
  ];

  if (satellite) {
    layers.push({
      id: LAYER_SATELLITE,
      type: "raster",
      source: SOURCE_SATELLITE,
      layout: { visibility: "none" },
    });
  }

  if (openseamap) {
    layers.push({
      id: LAYER_OPENSEAMAP,
      type: "raster",
      source: SOURCE_OPENSEAMAP,
      paint: { "raster-opacity": 0.8 },
    });
  }

  return { version: 8, sources, layers };
}
