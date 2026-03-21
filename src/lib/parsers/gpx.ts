import { DOMParser } from "@xmldom/xmldom";
import { gpx } from "@tmcw/togeojson";
import type { ParsedPoint, ParsedTrace } from "../types";
import { haversineNm } from "../geo/distance";
import { bearingDeg } from "../geo/heading";
import { speedKn } from "../geo/speed";
import { detectSource } from "./detect-source";

export function parseGpx(
  content: string,
  filename: string
): { trace: ParsedTrace; source: string } {
  const doc = new DOMParser().parseFromString(content, "text/xml");
  const geojson = gpx(doc);
  const source = detectSource(content);

  const points: ParsedPoint[] = [];

  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (!geom) continue;

    const coordArrays: number[][][] = [];
    if (geom.type === "LineString") {
      coordArrays.push(geom.coordinates as number[][]);
    } else if (geom.type === "MultiLineString") {
      for (const line of geom.coordinates as number[][][]) {
        coordArrays.push(line);
      }
    } else if (geom.type === "Point") {
      coordArrays.push([geom.coordinates as number[]]);
    }

    const coordTimes: string[] | undefined =
      feature.properties?.coordTimes ??
      feature.properties?.coordinateProperties?.times;

    let timeIndex = 0;
    for (const coords of coordArrays) {
      for (const coord of coords) {
        const [lon, lat, elevation] = coord;
        const timeStr =
          coordTimes && timeIndex < coordTimes.length
            ? coordTimes[timeIndex]
            : null;

        points.push({
          lat,
          lon,
          timestamp: timeStr ? new Date(timeStr) : null,
          speedKn: null,
          headingDeg: null,
          elevationM: elevation !== undefined ? elevation : null,
        });
        timeIndex++;
      }
    }
  }

  enrichPoints(points);

  const name =
    geojson.features[0]?.properties?.name ||
    filename.replace(/\.(gpx|kml)$/i, "");

  return { trace: { name, points }, source };
}

function enrichPoints(points: ParsedPoint[]) {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const dist = haversineNm(prev.lat, prev.lon, curr.lat, curr.lon);
    curr.headingDeg = Math.round(bearingDeg(prev.lat, prev.lon, curr.lat, curr.lon));

    if (prev.timestamp && curr.timestamp) {
      const dt = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      curr.speedKn = Math.round(speedKn(dist, dt) * 10) / 10;
    }
  }

  if (points.length > 0 && points[0].headingDeg === null && points.length > 1) {
    points[0].headingDeg = points[1].headingDeg;
    points[0].speedKn = points[1].speedKn;
  }
}
