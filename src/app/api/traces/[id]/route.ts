import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
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

  const trace = await prisma.trace.findUnique({
    where: { id },
    include: {
      points: {
        orderBy: { pointIndex: "asc" },
      },
    },
  });

  if (!trace) {
    return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });
  }

  // Verifier ownership (ou admin)
  if (trace.userId !== session.user.id && !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  return NextResponse.json(trace);
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

  const trace = await prisma.trace.findUnique({ where: { id } });

  if (!trace) {
    return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });
  }

  if (trace.userId !== session.user.id && !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  try {
    await prisma.trace.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/traces/[id]", erreur);
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
