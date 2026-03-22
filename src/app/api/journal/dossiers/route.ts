import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import type { ResumeDossier } from "@/lib/types";

export async function GET(_requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const dossiers = await prisma.dossier.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { aventures: true, navigations: true } } },
    });

    const resultat: ResumeDossier[] = dossiers.map((d) => ({
      id: d.id,
      nom: d.nom,
      description: d.description,
      nbAventures: d._count.aventures,
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
    const { nom, description } = await requete.json();

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const dossier = await prisma.dossier.create({
      data: {
        nom: nom.trim(),
        description: description?.trim() || null,
        userId,
      },
    });

    const resultat: ResumeDossier = {
      id: dossier.id,
      nom: dossier.nom,
      description: dossier.description,
      nbAventures: 0,
      nbNavigations: 0,
      createdAt: dossier.createdAt.toISOString(),
    };

    return NextResponse.json(resultat, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/journal/dossiers", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
