import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const dossierId = (await params).id;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, userId },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
  }

  try {
    const { nom, description } = await requete.json();

    if (typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }

    const aventure = await prisma.aventure.create({
      data: {
        nom: nom.trim(),
        description: description?.trim() || null,
        dossierId,
        userId,
      },
    });

    return NextResponse.json(
      {
        id: aventure.id,
        nom: aventure.nom,
        description: aventure.description,
        dossierId: aventure.dossierId,
        createdAt: aventure.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (erreur) {
    journalErreur("POST /api/journal/dossiers/[dossierId]/aventures", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
