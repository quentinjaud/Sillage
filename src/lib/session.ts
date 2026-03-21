import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { journalErreur } from "@/lib/journal";

/**
 * Recupere la session de l'utilisateur connecte.
 * Retourne null si non authentifie ou en cas d'erreur.
 */
export async function obtenirSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (erreur) {
    journalErreur("obtenirSession", erreur);
    return null;
  }
}

/**
 * Recupere la session ou leve une erreur (pour les routes protegees).
 */
export async function exigerSession() {
  const session = await obtenirSession();
  if (!session) {
    throw new Error("Non authentifie");
  }
  return session;
}

/**
 * Verifie si l'utilisateur est admin.
 */
export function estAdmin(session: { user: { role?: string } }): boolean {
  return session.user.role === "admin";
}

/**
 * Recupere la session et verifie le role admin. Leve une erreur sinon.
 */
export async function exigerAdmin() {
  const session = await exigerSession();
  if (!estAdmin(session)) {
    throw new Error("Acces reserve aux administrateurs");
  }
  return session;
}
