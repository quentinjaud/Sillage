import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { journalErreur } from "@/lib/journal";

type ResultatSession =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; erreur: null }
  | { session: null; erreur: "non_authentifie" | "erreur_serveur" };

/**
 * Recupere la session de l'utilisateur connecte.
 * Distingue "pas de session" de "erreur serveur".
 */
async function obtenirSessionAvecStatut(): Promise<ResultatSession> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { session: null, erreur: "non_authentifie" };
    }
    return { session, erreur: null };
  } catch (erreur) {
    journalErreur("obtenirSession", erreur);
    return { session: null, erreur: "erreur_serveur" };
  }
}

/**
 * Recupere la session de l'utilisateur connecte.
 * Retourne null si non authentifie ou en cas d'erreur.
 */
export async function obtenirSession() {
  const resultat = await obtenirSessionAvecStatut();
  return resultat.session;
}

/**
 * Recupere la session. Redirige vers /connexion si non authentifie.
 * En cas d'erreur serveur, leve une erreur (pour afficher une page d'erreur).
 */
export async function exigerSession() {
  const resultat = await obtenirSessionAvecStatut();

  if (resultat.erreur === "erreur_serveur") {
    throw new Error("Erreur de connexion au serveur d'authentification");
  }

  if (!resultat.session) {
    throw new Error("Non authentifie");
  }

  return resultat.session;
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

/**
 * Retourne l'ID de l'utilisateur effectif (impersonne si admin + cookie present).
 * Utiliser dans les pages et API qui filtrent par userId.
 */
export async function obtenirIdUtilisateurEffectif(
  session: { user: { id: string; role?: string } }
): Promise<string> {
  if (!estAdmin(session)) {
    return session.user.id;
  }

  try {
    const jar = await cookies();
    const cookie = jar.get("sillage-impersonate");
    if (cookie?.value) {
      const idCible = cookie.value.split(":")[0];
      if (idCible && idCible !== session.user.id) {
        return idCible;
      }
    }
  } catch {
    // cookies() peut echouer dans certains contextes
  }

  return session.user.id;
}
