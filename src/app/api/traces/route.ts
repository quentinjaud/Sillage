import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { importerTrace } from "@/lib/services/import-trace";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(requete: NextRequest) {
  try {
    const session = await obtenirSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const donnees = await requete.formData();
    const fichier = donnees.get("file") as File | null;

    if (!fichier) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    const userId = await obtenirIdUtilisateurEffectif(session);
    const trace = await importerTrace(fichier, userId);
    return NextResponse.json(trace, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/traces", erreur);
    const message =
      erreur instanceof Error ? erreur.message : "Erreur lors de l'import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);
  const traces = await prisma.trace.findMany({
    where: { userId },
    orderBy: [
      { startedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      filename: true,
      format: true,
      source: true,
      createdAt: true,
      startedAt: true,
      distanceNm: true,
      durationSeconds: true,
      avgSpeedKn: true,
      maxSpeedKn: true,
      bateauId: true,
      bateau: { select: { id: true, nom: true } },
    },
  });

  return NextResponse.json(traces);
}
