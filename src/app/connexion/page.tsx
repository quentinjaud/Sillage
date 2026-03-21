"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

function FormulaireConnexion() {
  const routeur = useRouter();
  const params = useSearchParams();
  const retour = params.get("retour") || "/traces";

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const resultat = await signIn.email({
        email,
        password: motDePasse,
      });

      if (resultat.error) {
        setErreur(resultat.error.message || "Email ou mot de passe incorrect");
        setChargement(false);
        return;
      }

      routeur.push(retour);
    } catch {
      setErreur("Une erreur est survenue. Veuillez reessayer.");
      setChargement(false);
    }
  }

  return (
    <form onSubmit={gererSoumission} className="auth-form">
      {erreur && <div className="auth-error">{erreur}</div>}

      <div className="auth-field">
        <label htmlFor="email" className="auth-label">
          Adresse email
        </label>
        <input
          id="email"
          type="email"
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="vous@exemple.com"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="motDePasse" className="auth-label">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          type="password"
          className="auth-input"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
          autoComplete="current-password"
          minLength={8}
        />
      </div>

      <button type="submit" className="auth-submit" disabled={chargement}>
        {chargement ? "Connexion en cours..." : "Se connecter"}
      </button>
    </form>
  );
}

export default function PageConnexion() {
  return (
    <div className="auth-container">
      <h1 className="auth-title">Connexion</h1>

      <Suspense fallback={<div>Chargement...</div>}>
        <FormulaireConnexion />
      </Suspense>

      <p className="auth-footer-text">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="auth-link">
          Creer un compte
        </Link>
      </p>
    </div>
  );
}
