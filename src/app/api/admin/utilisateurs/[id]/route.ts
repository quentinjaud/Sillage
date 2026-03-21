import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function GET(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const { id } = await params;

  const utilisateur = await prisma.user.findUnique({
    where: { id },
    include: {
      traces: {
        select: { id: true, name: true, createdAt: true, distanceNm: true },
        orderBy: { createdAt: "desc" },
      },
      bateaux: {
        select: { id: true, nom: true, classe: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!utilisateur) {
    return NextResponse.json(
      { error: "Utilisateur non trouve" },
      { status: 404 }
    );
  }

  return NextResponse.json(utilisateur);
}

export async function DELETE(
  _requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const { id } = await params;

  // Empecher la suppression de soi-meme
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Impossible de supprimer votre propre compte" },
      { status: 400 }
    );
  }

  try {
    // Detacher les traces (les rendre orphelines) avant de supprimer le user
    await prisma.trace.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/admin/utilisateurs/[id]", erreur);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
