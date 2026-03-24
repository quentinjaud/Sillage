import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
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
  const userId = await obtenirIdUtilisateurEffectif(session);

  // Verifier que la navigation appartient a l'utilisateur
  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
  });
  if (!navigation) {
    return NextResponse.json({ error: "Navigation non trouvee" }, { status: 404 });
  }

  const entrees = await prisma.entreeJournal.findMany({
    where: { navigationId: id },
    orderBy: { timestamp: "asc" },
  });

  return NextResponse.json(entrees);
}

export async function POST(
  requete: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { id } = await params;
  const userId = await obtenirIdUtilisateurEffectif(session);

  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
  });
  if (!navigation) {
    return NextResponse.json({ error: "Navigation non trouvee" }, { status: 404 });
  }

  try {
    const { timestamp, lat, lon, texte } = await requete.json();

    if (!texte || typeof texte !== "string" || texte.trim().length === 0) {
      return NextResponse.json({ error: "Texte requis" }, { status: 400 });
    }

    if (!timestamp) {
      return NextResponse.json({ error: "Timestamp requis" }, { status: 400 });
    }

    const entree = await prisma.entreeJournal.create({
      data: {
        navigationId: id,
        timestamp: new Date(timestamp),
        lat: lat ?? null,
        lon: lon ?? null,
        texte: texte.trim(),
      },
    });

    return NextResponse.json(entree, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/journal/navigations/[id]/entrees", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
