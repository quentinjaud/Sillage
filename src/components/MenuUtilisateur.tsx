"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

export function MenuUtilisateur() {
  const routeur = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="app-header-user" />;
  }

  if (!session) {
    return (
      <div className="app-header-user">
        <div className="app-header-user-links">
          <Link href="/connexion" className="app-header-user-link">
            Connexion
          </Link>
          <Link href="/inscription" className="app-header-user-link">
            Inscription
          </Link>
        </div>
      </div>
    );
  }

  const estAdmin = session.user.role === "admin";

  return (
    <>
      <nav className="app-header-nav">
        <Link
          href="/traces"
          className={`app-header-nav-link ${pathname === "/traces" ? "active" : ""}`}
        >
          Traces
        </Link>
        <Link
          href="/bateaux"
          className={`app-header-nav-link ${pathname === "/bateaux" ? "active" : ""}`}
        >
          Bateaux
        </Link>
        {estAdmin && (
          <Link
            href="/admin"
            className={`app-header-nav-link ${pathname.startsWith("/admin") ? "active" : ""}`}
          >
            Admin
          </Link>
        )}
      </nav>
      <div className="app-header-spacer" />
      <div className="app-header-user">
        <span className="app-header-user-name">{session.user.name}</span>
        <button
          className="app-header-logout-btn"
          onClick={async () => {
            await signOut();
            routeur.push("/");
          }}
        >
          Deconnexion
        </button>
      </div>
    </>
  );
}
