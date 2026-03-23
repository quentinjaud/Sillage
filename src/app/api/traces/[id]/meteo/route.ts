import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { chargerVentOpenMeteo, supprimerVentOpenMeteo } from "@/lib/services/open-meteo-archive";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id } = await params;
  const trace = await prisma.trace.findUnique({ where: { id } });
  if (!trace) return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });

  const userId = await obtenirIdUtilisateurEffectif(session);
  if (trace.userId !== userId && !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  try {
    const resultat = await chargerVentOpenMeteo(id);
    return NextResponse.json(resultat);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("deja presentes") ? 409
      : message.includes("trop recente") ? 422
      : message.includes("Aucun point") ? 422
      : message.includes("Rate limit") ? 429
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { id } = await params;
  const trace = await prisma.trace.findUnique({ where: { id } });
  if (!trace) return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });

  const userId = await obtenirIdUtilisateurEffectif(session);
  if (trace.userId !== userId && !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await supprimerVentOpenMeteo(id);
  return new NextResponse(null, { status: 204 });
}
