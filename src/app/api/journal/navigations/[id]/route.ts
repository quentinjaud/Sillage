import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, obtenirIdUtilisateurEffectif } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

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
    const { nom, date, type, aventureId, traceId } = await requete.json();

    const data: {
      nom?: string;
      date?: Date;
      type?: "SOLO" | "REGATE";
      aventureId?: string | null;
      traceId?: string | null;
    } = {};

    if (nom !== undefined) {
      if (typeof nom !== "string" || nom.trim().length === 0) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      data.nom = nom.trim();
    }

    if (date !== undefined) {
      data.date = new Date(date);
    }

    if (type !== undefined) {
      data.type = type === "REGATE" ? "REGATE" : "SOLO";
    }

    if (aventureId !== undefined) {
      if (aventureId === null || aventureId === "") {
        data.aventureId = null;
      } else {
        const aventure = await prisma.aventure.findFirst({
          where: { id: aventureId, userId, dossierId: navigation.dossierId },
        });

        if (!aventure) {
          return NextResponse.json(
            { error: "Aventure non trouvee" },
            { status: 404 }
          );
        }

        data.aventureId = aventureId;
      }
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
      date: miseAJour.date.toISOString(),
      type: miseAJour.type,
      dossierId: miseAJour.dossierId,
      aventureId: miseAJour.aventureId,
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
