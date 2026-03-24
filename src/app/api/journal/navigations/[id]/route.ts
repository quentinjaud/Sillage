import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";
import { genererSlug } from "@/lib/slug";

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

  try {
    const navigation = await prisma.navigation.findFirst({
      where: { id, userId },
      include: {
        trace: {
          select: {
            id: true,
            name: true,
            distanceNm: true,
            durationSeconds: true,
            avgSpeedKn: true,
            maxSpeedKn: true,
            polylineSimplifiee: true,
            bateau: { select: { id: true, nom: true } },
          },
        },
        sousNavigations: {
          orderBy: { date: "desc" },
          include: {
            trace: {
              select: {
                id: true,
                name: true,
                distanceNm: true,
                durationSeconds: true,
                avgSpeedKn: true,
                maxSpeedKn: true,
                polylineSimplifiee: true,
                bateau: { select: { id: true, nom: true } },
              },
            },
          },
        },
      },
    });

    if (!navigation) {
      return NextResponse.json(
        { error: "Navigation non trouvee" },
        { status: 404 }
      );
    }

    return NextResponse.json(navigation);
  } catch (erreur) {
    journalErreur("GET /api/journal/navigations/[id]", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

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

  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
  });

  if (!navigation) {
    return NextResponse.json(
      { error: "Navigation non trouvee" },
      { status: 404 }
    );
  }

  try {
    const { nom, date, type, parentNavId, traceId } = await requete.json();

    const data: {
      nom?: string;
      slug?: string | null;
      date?: Date;
      type?: "SOLO" | "AVENTURE" | "REGATE";
      parentNavId?: string | null;
      traceId?: string | null;
    } = {};

    if (nom !== undefined) {
      if (typeof nom !== "string" || nom.trim().length === 0) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      data.nom = nom.trim();

      // Regenerer le slug
      const slugBase = genererSlug(data.nom);
      if (slugBase) {
        const existants = await prisma.navigation.findMany({
          where: { slug: { startsWith: slugBase }, id: { not: id } },
          select: { slug: true },
        });
        const slugsExistants = existants.map((n) => n.slug).filter(Boolean) as string[];
        data.slug = slugsExistants.includes(slugBase)
          ? (() => { let c = 2; while (slugsExistants.includes(`${slugBase}-${c}`)) c++; return `${slugBase}-${c}`; })()
          : slugBase;
      }
    }

    if (date !== undefined) {
      data.date = new Date(date);
    }

    if (type !== undefined) {
      if (["SOLO", "AVENTURE", "REGATE"].includes(type)) {
        data.type = type;
      }
    }

    if (parentNavId !== undefined) {
      data.parentNavId = parentNavId || null;
    }

    if (traceId !== undefined) {
      if (traceId === null || traceId === "") {
        data.traceId = null;
      } else {
        const trace = await prisma.trace.findFirst({
          where: { id: traceId, userId },
        });

        if (!trace) {
          return NextResponse.json(
            { error: "Trace non trouvee" },
            { status: 404 }
          );
        }

        const navigationExistante = await prisma.navigation.findUnique({
          where: { traceId },
        });

        if (navigationExistante && navigationExistante.id !== id) {
          return NextResponse.json(
            { error: "Trace deja liee a une navigation" },
            { status: 409 }
          );
        }

        data.traceId = traceId;
      }
    }

    const miseAJour = await prisma.navigation.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: miseAJour.id,
      nom: miseAJour.nom,
      slug: miseAJour.slug,
      date: miseAJour.date.toISOString(),
      type: miseAJour.type,
      dossierId: miseAJour.dossierId,
      parentNavId: miseAJour.parentNavId,
      traceId: miseAJour.traceId,
      createdAt: miseAJour.createdAt.toISOString(),
    });
  } catch (erreur) {
    journalErreur("PATCH /api/journal/navigations/[id]", erreur);
    return NextResponse.json(
      { error: "Erreur de mise a jour" },
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
  const userId = await obtenirIdUtilisateurEffectif(session);

  const navigation = await prisma.navigation.findFirst({
    where: { id, userId },
  });

  if (!navigation) {
    return NextResponse.json(
      { error: "Navigation non trouvee" },
      { status: 404 }
    );
  }

  try {
    await prisma.navigation.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (erreur) {
    journalErreur("DELETE /api/journal/navigations/[id]", erreur);
    return NextResponse.json(
      { error: "Erreur de suppression" },
      { status: 500 }
    );
  }
}
