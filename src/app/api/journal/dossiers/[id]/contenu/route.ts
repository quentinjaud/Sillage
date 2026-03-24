import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import type {
  ResumeNavigation,
  ResumeDossier,
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
    const [sousDossiers, navigations] = await Promise.all([
      prisma.dossier.findMany({
        where: { parentId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nom: true,
          description: true,
          markerLat: true,
          markerLon: true,
          parentId: true,
          createdAt: true,
          _count: { select: { sousDossiers: true, navigations: true } },
        },
      }),
      prisma.navigation.findMany({
        where: { dossierId: id, parentNavId: null },
        orderBy: { date: "desc" },
        select: {
          id: true,
          nom: true,
          slug: true,
          date: true,
          type: true,
          dossierId: true,
          parentNavId: true,
          polylineCache: true,
          createdAt: true,
          _count: { select: { sousNavigations: true } },
          trace: {
            select: {
              id: true,
              name: true,
              distanceNm: true,
              durationSeconds: true,
              avgSpeedKn: true,
              maxSpeedKn: true,
              polylineSimplifiee: true,
              bateau: { select: { id: true, nom: true } },
            },
          },
        },
      }),
    ]);

    const resultat: ContenuDossier = {
      sousDossiers: sousDossiers.map((d): ResumeDossier => ({
        id: d.id,
        nom: d.nom,
        description: d.description,
        markerLat: d.markerLat,
        markerLon: d.markerLon,
        parentId: d.parentId,
        nbSousDossiers: d._count.sousDossiers,
        nbNavigations: d._count.navigations,
        createdAt: d.createdAt.toISOString(),
      })),
      navigations: navigations.map((nav): ResumeNavigation => ({
        id: nav.id,
        nom: nav.nom,
        slug: nav.slug ?? null,
        date: nav.date.toISOString(),
        type: nav.type as "SOLO" | "AVENTURE" | "REGATE",
        dossierId: nav.dossierId,
        parentNavId: nav.parentNavId,
        nbSousNavs: nav._count.sousNavigations,
        polylineCache: (nav.polylineCache as [number, number][] | null) ?? null,
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
      })),
    };

    return NextResponse.json(resultat);
  } catch (erreur) {
    journalErreur("GET /api/journal/dossiers/[id]/contenu", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
