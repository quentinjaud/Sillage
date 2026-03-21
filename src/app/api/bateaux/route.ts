import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function GET() {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const bateaux = await prisma.bateau.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bateaux);
}

export async function POST(requete: NextRequest) {
  try {
    const session = await obtenirSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const corps = await requete.json();
    const { nom, type, classe, longueur } = corps;

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom du bateau est requis" },
        { status: 400 }
      );
    }

    const bateau = await prisma.bateau.create({
      data: {
        nom: nom.trim(),
        type: type?.trim() || null,
        classe: classe?.trim() || null,
        longueur: longueur ? Number(longueur) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(bateau, { status: 201 });
  } catch (erreur) {
    journalErreur("POST /api/bateaux", erreur);
    return NextResponse.json(
      { error: "Erreur lors de la creation du bateau" },
      { status: 500 }
    );
  }
}
