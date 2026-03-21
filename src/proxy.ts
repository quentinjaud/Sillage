import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROUTES_PROTEGEES = ["/traces", "/bateaux", "/trace/", "/admin"];

export function proxy(requete: NextRequest) {
  const { pathname } = requete.nextUrl;

  // Laisser passer la page d'accueil, les pages auth et les fichiers statiques
  if (pathname === "/" || pathname === "/connexion" || pathname === "/inscription") {
    return NextResponse.next();
  }

  // Verifier si la route est protegee
  const estProtegee = ROUTES_PROTEGEES.some((route) =>
    pathname.startsWith(route)
  );

  if (!estProtegee) {
    return NextResponse.next();
  }

  // Verifier la presence d'un cookie de session Better Auth
  // Le nom peut varier selon l'environnement (point ou tiret comme separateur)
  const cookieHeader = requete.headers.get("cookie") || "";
  const aUnCookieSession = cookieHeader.includes("better-auth");

  if (!aUnCookieSession) {
    const urlConnexion = new URL("/connexion", requete.url);
    urlConnexion.searchParams.set("retour", pathname);
    return NextResponse.redirect(urlConnexion);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
