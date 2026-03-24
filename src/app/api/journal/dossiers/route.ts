import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import { prochainPointSnap, NOM_DOSSIER_DEFAUT, POSITION_DOSSIER_DEFAUT } from "@/lib/pointsSnap";
import type { ResumeDossier } from "@/lib/types";

export async function GET(requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    // Auto-creer le dossier "Non classes" si l'utilisateur n'en a pas
    const dossierDefaut = await prisma.dossier.findFirst({
      where: { userId, nom: NOM_DOSSIER_DEFAUT },
    });

    if (!dossierDefaut) {
      await prisma.dossier.create({
        data: {
          nom: NOM_DOSSIER_DEFAUT,
          description: null,
          markerLat: POSITION_DOSSIER_DEFAUT.lat,
          markerLon: POSITION_DOSSIER_DEFAUT.lon,
          userId,
        },
      });
    }

    const tousLesDossiers = requete.nextUrl.searchParams.get("tous") === "1";

    const dossiers = await prisma.dossier.findMany({
      where: tousLesDossiers ? { userId } : { userId, parentId: null },
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
    });

    const resultat: ResumeDossier[] = dossiers.map((d) => ({
      id: d.id,
      nom: d.nom,
      description: d.description,
      markerLat: d.markerLat,
      markerLon: d.markerLon,
      parentId: d.parentId,
      nbSousDossiers: d._count.sousDossiers,
      nbNavigations: d._count.navigations,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json(resultat);
  } catch (erreur) {
    journalErreur("GET /api/journal/dossiers", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const { nom, description, markerLat, markerLon, parentId } = await requete.json();

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    let lat = markerLat;
    let lon = markerLon;

    if (lat == null || lon == null) {
      // Trouver un point snap libre
      const existants = await prisma.dossier.findMany({
        where: { userId, markerLat: { not: null }, markerLon: { not: null } },
        select: { markerLat: true, markerLon: true },
      });
      const positionsUtilisees = existants
        .filter((d): d is { markerLat: number; markerLon: number } => d.markerLat !== null && d.markerLon !== null)
        .map((d) => ({ lat: d.markerLat, lon: d.markerLon }));
      const snap = prochainPointSnap(positionsUtilisees);
      lat = snap.lat;
      lon = snap.lon;
    }

    // Valider le parent si fourni
    if (parentId) {
      const parent = await prisma.dossier.findFirst({
        where: { id: parentId, userId },
      });
      if (!parent) {
        return NextResponse.json({ error: "Dossier parent non trouve" }, { status: 404 });
      }
    }

    const dossier = await prisma.dossier.create({
      data: {
        nom: nom.trim(),
        description: description?.trim() || null,
        markerLat: parentId ? null : lat,
        markerLon: parentId ? null : lon,
        parentId: parentId || null,
        userId,
      },
    });

    const resultat: ResumeDossier = {
      id: dossier.id,
      nom: dossier.nom,
      description: dossier.description,
      markerLat: dossier.markerLat,
      markerLon: dossier.markerLon,
      parentId: dossier.parentId,
      nbSousDossiers: 0,
      nbNavigations: 0,
      createdAt: dossier.createdAt.toISOString(),
    };

    return NextResponse.json(resultat, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/journal/dossiers", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
