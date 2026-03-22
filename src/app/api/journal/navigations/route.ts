import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const { nom, date, type, dossierId, aventureId, traceId } =
      await requete.json();

    if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Date requise" }, { status: 400 });
    }

    if (!dossierId) {
      return NextResponse.json(
        { error: "dossierId requis" },
        { status: 400 }
      );
    }

    const dossier = await prisma.dossier.findFirst({
      where: { id: dossierId, userId },
    });

    if (!dossier) {
      return NextResponse.json({ error: "Dossier non trouve" }, { status: 404 });
    }

    if (aventureId) {
      const aventure = await prisma.aventure.findFirst({
        where: { id: aventureId, userId, dossierId },
      });

      if (!aventure) {
        return NextResponse.json(
          { error: "Aventure non trouvee" },
          { status: 404 }
        );
      }
    }

    if (traceId) {
      const trace = await prisma.trace.findFirst({
        where: { id: traceId, userId },
      });

      if (!trace) {
        return NextResponse.json({ error: "Trace non trouvee" }, { status: 404 });
      }

      const navigationExistante = await prisma.navigation.findUnique({
        where: { traceId },
      });

      if (navigationExistante) {
        return NextResponse.json(
          { error: "Trace deja liee a une navigation" },
          { status: 409 }
        );
      }
    }

    const typeNavigation = type === "REGATE" ? "REGATE" : "SOLO";

    const navigation = await prisma.navigation.create({
      data: {
        nom: nom.trim(),
        date: new Date(date),
        type: typeNavigation,
        userId,
        dossierId,
        aventureId: aventureId || null,
        traceId: traceId || null,
      },
    });

    return NextResponse.json(
      {
        id: navigation.id,
        nom: navigation.nom,
        date: navigation.date.toISOString(),
        type: navigation.type,
        dossierId: navigation.dossierId,
        aventureId: navigation.aventureId,
        traceId: navigation.traceId,
        createdAt: navigation.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (erreur) {
    journalErreur("POST /api/journal/navigations", erreur);
    return NextResponse.json({ error: "Erreur de creation" }, { status: 500 });
  }
}
