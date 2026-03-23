export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  obtenirSession,
  estAdmin,
  obtenirIdUtilisateurEffectif,
} from "@/lib/session";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import NavigationVueClient from "@/components/NavigationVueClient";
import { calculerStatsVent, filtrerCellulesParPlage } from "@/lib/geo/stats-vent";
import type { CelluleMeteoClient } from "@/lib/types";

interface PropsPage {
  params: Promise<{ id: string }>;
}

export default async function NavigationDetailPage({ params }: PropsPage) {
  const session = await obtenirSession();
  if (!session) notFound();

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const include = {
    dossier: { select: { id: true, nom: true } },
    aventure: { select: { id: true, nom: true } },
    trace: {
      include: {
        points: {
          where: { isExcluded: false },
          orderBy: { pointIndex: "asc" as const },
        },
        bateau: { select: { id: true, nom: true } },
        cellulesMeteo: true,
      },
    },
  };

  let navigation = await prisma.navigation.findFirst({
    where: { id, userId },
    include,
  });

  if (!navigation && estAdmin(session)) {
    navigation = await prisma.navigation.findUnique({
      where: { id },
      include,
    });
  }

  if (!navigation) notFound();

  const trace = navigation.trace;

  const cellulesMeteo: CelluleMeteoClient[] = (trace?.cellulesMeteo ?? []).map((c) => ({
    latitude: c.latitude,
    longitude: c.longitude,
    dateDebut: c.dateDebut.toISOString(),
    dateFin: c.dateFin.toISOString(),
    ventVitesseKn: c.ventVitesseKn,
    ventRafalesKn: c.ventRafalesKn,
    ventDirectionDeg: c.ventDirectionDeg,
  }));

  const pointsAvecTimestamp = trace?.points.filter((p) => p.timestamp != null) ?? [];
  const traceTimestamps = pointsAvecTimestamp.length > 0;

  // Filtrer les cellules meteo sur la plage de navigation pour les stats
  const premierTs = pointsAvecTimestamp[0]?.timestamp;
  const dernierTs = pointsAvecTimestamp[pointsAvecTimestamp.length - 1]?.timestamp;
  const cellulesNav = premierTs && dernierTs
    ? filtrerCellulesParPlage(cellulesMeteo, premierTs.toISOString(), dernierTs.toISOString())
    : cellulesMeteo;
  const statsVent =
    cellulesMeteo.length > 0
      ? { ...calculerStatsVent(cellulesNav), source: "AROME France", resolution: "2.5km/1h" }
      : null;
  const traceTropRecente =
    traceTimestamps &&
    (() => {
      const dernierTs = pointsAvecTimestamp[pointsAvecTimestamp.length - 1]?.timestamp;
      return dernierTs ? Date.now() - new Date(dernierTs).getTime() < 2 * 24 * 60 * 60 * 1000 : false;
    })();

  const pointsSerialises = trace
    ? trace.points.map((p) => ({
        lat: p.lat,
        lon: p.lon,
        timestamp: p.timestamp?.toISOString() ?? null,
        speedKn: p.speedKn,
        headingDeg: p.headingDeg,
        elevationM: p.elevationM,
        pointIndex: p.pointIndex,
      }))
    : [];

  return (
    <div className="trace-vue-layout">
      <Link href="/journal" className="navigation-retour" title="Retour au journal">
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Journal
      </Link>

      {trace && trace.points.length > 0 ? (
        <NavigationVueClient
          navigationId={navigation.id}
          nom={navigation.nom}
          date={navigation.date.toISOString()}
          type={navigation.type}
          bateau={trace.bateau}
          breadcrumb={`${navigation.dossier.nom}${navigation.aventure ? ` > ${navigation.aventure.nom}` : ""}`}
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
      ) : (
        <div className="navigation-vide">
          <p>Aucune trace associee a cette navigation.</p>
          <Link href="/journal">Retour au journal</Link>
        </div>
      )}
    </div>
  );
}
