export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
import TraceMapWrapper from "@/components/Map/TraceMapWrapper";
import StatsPanel from "@/components/Stats/StatsPanel";
import SpeedChart from "@/components/Stats/SpeedChart";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    },
  });

  if (!trace) notFound();

  // Verifier ownership (ou admin) — si pas de session (erreur DB), on bloque
  if (session) {
    if (trace.userId !== session.user.id && !estAdmin(session)) {
      notFound();
    }
  } else {
    // Pas de session disponible — le proxy a laisse passer mais on ne peut pas verifier ownership
    notFound();
  }

  const pointsSerialises = trace.points.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    timestamp: p.timestamp?.toISOString() ?? null,
    speedKn: p.speedKn,
    headingDeg: p.headingDeg,
    elevationM: p.elevationM,
    pointIndex: p.pointIndex,
  }));

  return (
    <div className="trace-detail-layout">
      <div className="trace-header">
        <Link href="/traces" className="trace-back-link">
          <ArrowLeft style={{ width: 20, height: 20 }} />
        </Link>
        <h1 className="trace-title">{trace.name}</h1>
        <span className="trace-badge">{trace.format}</span>
        {trace.source !== "unknown" && (
          <span className="trace-badge-source">{trace.source}</span>
        )}
      </div>

      <div className="trace-detail-grid">
        <div className="trace-map-container">
          <TraceMapWrapper
            points={pointsSerialises}
            maxSpeed={trace.maxSpeedKn ?? 10}
          />
        </div>

        <div className="trace-sidebar">
          <StatsPanel
            distanceNm={trace.distanceNm}
            durationSeconds={trace.durationSeconds}
            avgSpeedKn={trace.avgSpeedKn}
            maxSpeedKn={trace.maxSpeedKn}
          />
          <SpeedChart points={pointsSerialises} />
        </div>
      </div>
    </div>
  );
}
