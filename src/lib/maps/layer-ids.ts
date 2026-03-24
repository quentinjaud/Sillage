/** Identifiants des sources et layers MapLibre — centralises pour eviter les strings magiques */

// Sources
export const SOURCE_OSM = "osm";
export const SOURCE_SATELLITE = "satellite";
export const SOURCE_OPENSEAMAP = "openseamap";

// Layers (meme nom que les sources pour simplifier)
export const LAYER_OSM = "osm";
export const LAYER_SATELLITE = "satellite";
export const LAYER_OPENSEAMAP = "openseamap";

/** Type pour le fond de carte actif */
export type FondCarte = "osm" | "satellite";
