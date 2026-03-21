import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function GET(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const bateau = await prisma.bateau.findUnique({ where: { id } });

  if (!bateau || bateau.userId !== session.user.id) {
    return NextResponse.json({ error: "Bateau non trouve" }, { status: 404 });
  }

  return NextResponse.json(bateau);
}

export async function PUT(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await obtenirSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { id } = await params;
    const bateau = await prisma.bateau.findUnique({ where: { id } });

    if (!bateau || bateau.userId !== session.user.id) {
      return NextResponse.json({ error: "Bateau non trouve" }, { status: 404 });
    }

    const corps = await requete.json();
    const { nom, type, classe, longueur } = corps;

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom du bateau est requis" },
        { status: 400 }
      );
    }

    const bateauMaj = await prisma.bateau.update({
      where: { id },
      data: {
        nom: nom.trim(),
        type: type?.trim() || null,
        classe: classe?.trim() || null,
        longueur: longueur ? Number(longueur) : null,
      },
    });

    return NextResponse.json(bateauMaj);
  } catch (erreur) {
    journalErreur("PUT /api/bateaux/[id]", erreur);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour" },
      { status: 500 }
    );
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
  const bateau = await prisma.bateau.findUnique({ where: { id } });

  if (!bateau || bateau.userId !== session.user.id) {
    return NextResponse.json({ error: "Bateau non trouve" }, { status: 404 });
  }

  try {
    await prisma.bateau.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/bateaux/[id]", erreur);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
