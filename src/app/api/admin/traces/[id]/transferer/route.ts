import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const corps = await requete.json();
    const { userId } = corps;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId est requis" },
        { status: 400 }
      );
    }

    // Verifier que la trace existe
    const trace = await prisma.trace.findUnique({ where: { id } });
    if (!trace) {
      return NextResponse.json(
        { error: "Trace non trouvee" },
        { status: 404 }
      );
    }

    // Verifier que l'utilisateur destination existe
    const destinataire = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!destinataire) {
      return NextResponse.json(
        { error: "Utilisateur destination non trouve" },
        { status: 404 }
      );
    }

    // Transferer la trace
    const traceMaj = await prisma.trace.update({
      where: { id },
      data: { userId },
    });

    return NextResponse.json(traceMaj);
  } catch (erreur) {
    journalErreur("POST /api/admin/traces/[id]/transferer", erreur);
    return NextResponse.json(
      { error: "Erreur lors du transfert" },
      { status: 500 }
    );
  }
}
