import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenirSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PageAccueil() {
  const session = await obtenirSession();

  if (session) {
    redirect("/journal");
  }

  return (
    <div className="landing-hero">
      <h1 className="landing-title">Sillage</h1>
      <p className="landing-subtitle">
        Le carnet de bord intelligent du navigateur. Analysez vos traces GPS,
        suivez vos performances et documentez vos navigations.
      </p>
      <div className="landing-actions">
        <Link href="/inscription" className="landing-btn-primary">
          Creer un compte
        </Link>
        <Link href="/connexion" className="landing-btn-secondary">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
