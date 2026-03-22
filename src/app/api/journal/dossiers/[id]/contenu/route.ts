import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import type {
  ResumeNavigation,
  ResumeAventure,
  ContenuDossier,
} from "@/lib/types";

export async function GET(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const dossier = await prisma.dossier.findFirst({
    where: { id, userId },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
  }

  try {
    const selectTrace = {
      id: true,
      name: true,
      distanceNm: true,
      durationSeconds: true,
      avgSpeedKn: true,
      maxSpeedKn: true,
      polylineSimplifiee: true,
      bateau: { select: { id: true, nom: true } },
    };

    const selectNavigation = {
      id: true,
      nom: true,
      date: true,
      type: true,
      dossierId: true,
      aventureId: true,
      createdAt: true,
      trace: { select: selectTrace },
    };

    const [aventures, navigationsOrphelines] = await Promise.all([
      prisma.aventure.findMany({
        where: { dossierId: id },
        orderBy: { createdAt: "desc" },
        include: {
          navigations: {
            orderBy: { date: "desc" },
            select: selectNavigation,
          },
        },
      }),
      prisma.navigation.findMany({
        where: { dossierId: id, aventureId: null },
        orderBy: { date: "desc" },
        select: selectNavigation,
      }),
    ]);

    function formaterNavigation(nav: {
      id: string;
      nom: string;
      date: Date;
      type: string;
      dossierId: string;
      aventureId: string | null;
      createdAt: Date;
      trace: {
        id: string;
        name: string;
        distanceNm: number | null;
        durationSeconds: number | null;
        avgSpeedKn: number | null;
        maxSpeedKn: number | null;
        polylineSimplifiee: unknown;
        bateau: { id: string; nom: string } | null;
      } | null;
    }): ResumeNavigation {
      return {
        id: nav.id,
        nom: nav.nom,
        date: nav.date.toISOString(),
        type: nav.type as "SOLO" | "REGATE",
        dossierId: nav.dossierId,
        aventureId: nav.aventureId,
        trace: nav.trace
          ? {
              id: nav.trace.id,
              name: nav.trace.name,
              distanceNm: nav.trace.distanceNm,
              durationSeconds: nav.trace.durationSeconds,
              avgSpeedKn: nav.trace.avgSpeedKn,
              maxSpeedKn: nav.trace.maxSpeedKn,
              polylineSimplifiee:
                (nav.trace.polylineSimplifiee as [number, number][] | null) ??
                null,
              bateau: nav.trace.bateau,
            }
          : null,
        createdAt: nav.createdAt.toISOString(),
      };
    }

    const resultat: ContenuDossier = {
      aventures: aventures.map(
        (a): ResumeAventure => ({
          id: a.id,
          nom: a.nom,
          description: a.description,
          navigations: a.navigations.map(formaterNavigation),
          createdAt: a.createdAt.toISOString(),
        })
      ),
      navigationsOrphelines: navigationsOrphelines.map(formaterNavigation),
    };

    return NextResponse.json(resultat);
  } catch (erreur) {
    journalErreur("GET /api/journal/dossiers/[id]/contenu", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
