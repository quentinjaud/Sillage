export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { ArrowLeft, Eraser } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TraceVueClient from "@/components/TraceVueClient";
import TitreEditable from "@/components/TitreEditable";
import { calculerStatsVent, filtrerCellulesParPlage } from "@/lib/geo/stats-vent";
import type { CelluleMeteoClient } from "@/lib/types";

interface PropsPage {
  params: Promise<{ id: string }>;
}

export default async function TraceDetailPage({ params }: PropsPage) {
  const session = await obtenirSession();
  const { id } = await params;

  const trace = await prisma.trace.findUnique({
    where: { id },
    include: {
      points: {
        orderBy: { pointIndex: "asc" },
      },
      bateau: { select: { nom: true } },
      cellulesMeteo: true,
    },
  });

  if (!trace) notFound();

  if (session) {
    const userId = await obtenirIdUtilisateurEffectif(session);
    if (trace.userId !== userId && !estAdmin(session)) {
      notFound();
    }
  } else {
    notFound();
  }

  const pointsNonExclus = trace.points.filter((p) => !p.isExcluded);
  const nbPointsExclus = trace.points.length - pointsNonExclus.length;

  const cellulesMeteo: CelluleMeteoClient[] = (trace.cellulesMeteo ?? []).map((c) => ({
    latitude: c.latitude,
    longitude: c.longitude,
    dateDebut: c.dateDebut.toISOString(),
    dateFin: c.dateFin.toISOString(),
    ventVitesseKn: c.ventVitesseKn,
    ventRafalesKn: c.ventRafalesKn,
    ventDirectionDeg: c.ventDirectionDeg,
  }));

  const traceTimestamps = pointsNonExclus.some((p) => p.timestamp != null);

  // Filtrer les cellules meteo sur la plage de navigation pour les stats
  const pointsAvecTs = pointsNonExclus.filter((p) => p.timestamp);
  const premierTs = pointsAvecTs[0]?.timestamp;
  const dernierTs = pointsAvecTs[pointsAvecTs.length - 1]?.timestamp;
  const cellulesNav = premierTs && dernierTs
    ? filtrerCellulesParPlage(cellulesMeteo, premierTs.toISOString(), dernierTs.toISOString())
    : cellulesMeteo;
  const statsVent =
    cellulesMeteo.length > 0
      ? { ...calculerStatsVent(cellulesNav), source: "AROME France", resolution: "2.5km/1h" }
      : null;
  const traceTropRecente =
    traceTimestamps &&
    pointsNonExclus.length > 0 &&
    (() => {
      const dernierTs = pointsNonExclus.filter((p) => p.timestamp).pop()?.timestamp;
      return dernierTs ? Date.now() - new Date(dernierTs).getTime() < 2 * 24 * 60 * 60 * 1000 : false;
    })();

  const pointsSerialises = pointsNonExclus.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    timestamp: p.timestamp?.toISOString() ?? null,
    speedKn: p.speedKn,
    headingDeg: p.headingDeg,
    elevationM: p.elevationM,
    pointIndex: p.pointIndex,
  }));

  return (
    <div className="trace-vue-layout">
      {/* Header flottant */}
      <div className="trace-vue-header">
        <Link href="/traces" className="nettoyage-back">
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </Link>
        <div className="trace-vue-header-info">
          <TitreEditable traceId={id} nom={trace.name} />
          <div className="trace-vue-meta">
            {trace.startedAt && (
              <span>{format(new Date(trace.startedAt), "d MMM yyyy", { locale: fr })}</span>
            )}
            {trace.bateau && <span>{trace.bateau.nom}</span>}
          </div>
        </div>
        <Link href={`/trace/${id}/nettoyage`} className="trace-clean-link" title="Nettoyer">
          <Eraser style={{ width: 16, height: 16 }} />
        </Link>
      </div>

      {/* Carte + graphique + stats (client component) */}
      <TraceVueClient
        points={pointsSerialises}
        maxSpeed={trace.maxSpeedKn ?? 10}
        distanceNm={trace.distanceNm}
        durationSeconds={trace.durationSeconds}
        avgSpeedKn={trace.avgSpeedKn}
        maxSpeedKn={trace.maxSpeedKn}
        traceId={trace.id}
        cellulesMeteo={cellulesMeteo}
        statsVent={statsVent}
        traceTimestamps={traceTimestamps}
        traceTropRecente={traceTropRecente}
      />
    </div>
  );
}
