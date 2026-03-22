import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obtenirSession, estAdmin } from "@/lib/session";
import { journalErreur } from "@/lib/journal";

export async function POST(requete: NextRequest) {
  try {
    const session = await obtenirSession();
    if (!session || !estAdmin(session)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { userId } = await requete.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    // Empecher de s'impersonner soi-meme
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Impossible de s'impersonner soi-meme" },
        { status: 400 }
      );
    }

    const cible = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!cible) {
      return NextResponse.json(
        { error: "Utilisateur non trouve" },
        { status: 404 }
      );
    }

    const reponse = NextResponse.json({ ok: true, user: cible });
    reponse.cookies.set("sillage-impersonate", `${cible.id}:${cible.name}`, {
      path: "/",
      maxAge: 60 * 60, // 1 heure
      sameSite: "lax",
    });

    return reponse;
  } catch (erreur) {
    journalErreur("POST /api/admin/impersonate", erreur);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await obtenirSession();
  if (!session || !estAdmin(session)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set("sillage-impersonate", "", {
    path: "/",
    maxAge: 0,
  });

  return reponse;
}
