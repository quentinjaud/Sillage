import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function PATCH(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const entree = await prisma.entreeJournal.findUnique({
    where: { id },
    include: { navigation: { select: { userId: true } } },
  });

  if (!entree || entree.navigation.userId !== userId) {
    return NextResponse.json({ error: "Entree non trouvee" }, { status: 404 });
  }

  try {
    const { texte } = await requete.json();

    if (!texte || typeof texte !== "string" || texte.trim().length === 0) {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    const miseAJour = await prisma.entreeJournal.update({
      where: { id },
      data: { texte: texte.trim() },
    });

    return NextResponse.json(miseAJour);
  } catch (erreur) {
    journalErreur("PATCH /api/journal/entrees/[id]", erreur);
    return NextResponse.json({ error: "Erreur de mise a jour" }, { status: 500 });
  }
}

export async function DELETE(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const entree = await prisma.entreeJournal.findUnique({
    where: { id },
    include: { navigation: { select: { userId: true } } },
  });

  if (!entree || entree.navigation.userId !== userId) {
    return NextResponse.json({ error: "Entree non trouvee" }, { status: 404 });
  }

  try {
    await prisma.entreeJournal.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/journal/entrees/[id]", erreur);
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
