import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { simplifierRDP } from "@/lib/geo/simplification";
import { journalErreur } from "@/lib/journal";

/** POST : recalcule polylineSimplifiee pour toutes les traces de l'utilisateur */
export async function POST() {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const traces = await prisma.trace.findMany({
      where: { userId },
      select: { id: true, polylineSimplifiee: true },
    });

    const sansPolyline = traces.filter((t) => !t.polylineSimplifiee);

    let mises = 0;
    for (const t of sansPolyline) {
      const points = await prisma.trackPoint.findMany({
        where: { traceId: t.id, isExcluded: false },
        orderBy: { pointIndex: "asc" },
        select: { lat: true, lon: true },
      });

      if (points.length < 2) continue;

      const simplifies = simplifierRDP(points, 0.005);
      const polyline = simplifies.map((p) => [p.lon, p.lat]);

      await prisma.trace.update({
        where: { id: t.id },
        data: { polylineSimplifiee: polyline },
      });
      mises++;
    }

    return NextResponse.json({ mises, total: sansPolyline.length });
  } catch (erreur) {
    journalErreur("POST /api/traces/recalculer-polylines", erreur);
    return NextResponse.json({ error: String(erreur) }, { status: 500 });
  }
}
