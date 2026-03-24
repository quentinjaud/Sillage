import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import { genererSlug } from "@/lib/slug";

export async function POST(requete: NextRequest) {
  const session = await obtenirSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = await obtenirIdUtilisateurEffectif(session);

  try {
    const { nom, date, type, dossierId, parentNavId, traceId } =
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

    if (parentNavId) {
      const parentNav = await prisma.navigation.findFirst({
        where: { id: parentNavId, userId, dossierId },
      });

      if (!parentNav) {
        return NextResponse.json(
          { error: "Navigation parente non trouvee" },
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

    const typeValide = ["SOLO", "AVENTURE", "REGATE"].includes(type) ? type : "SOLO";

    // Generer un slug unique
    const slugBase = genererSlug(nom.trim());
    let slug = slugBase;
    if (slug) {
      const existants = await prisma.navigation.findMany({
        where: { slug: { startsWith: slugBase } },
        select: { slug: true },
      });
      const slugsExistants = existants.map((n) => n.slug).filter(Boolean) as string[];
      if (slugsExistants.includes(slug)) {
        let compteur = 2;
        while (slugsExistants.includes(`${slugBase}-${compteur}`)) compteur++;
        slug = `${slugBase}-${compteur}`;
      }
    }

    const navigation = await prisma.navigation.create({
      data: {
        nom: nom.trim(),
        slug: slug || null,
        date: new Date(date),
        type: typeValide,
        userId,
        dossierId,
        parentNavId: parentNavId || null,
        traceId: traceId || null,
      },
    });

    return NextResponse.json(
      {
        id: navigation.id,
        nom: navigation.nom,
        slug: navigation.slug,
        date: navigation.date.toISOString(),
        type: navigation.type,
        dossierId: navigation.dossierId,
        parentNavId: navigation.parentNavId,
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
