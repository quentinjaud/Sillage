"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";

export default function PageInscription() {
  const routeur = useRouter();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (motDePasse !== confirmation) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }

    setChargement(true);

    try {
      const resultat = await signUp.email({
        name: nom,
        email,
        password: motDePasse,
      });

      if (resultat.error) {
        setErreur(resultat.error.message || "Erreur lors de l'inscription");
        setChargement(false);
        return;
      }

      routeur.push("/traces");
    } catch {
      setErreur("Une erreur est survenue. Veuillez reessayer.");
      setChargement(false);
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Creer un compte</h1>

      <form onSubmit={gererSoumission} className="auth-form">
        {erreur && <div className="auth-error">{erreur}</div>}

        <div className="auth-field">
          <label htmlFor="nom" className="auth-label">
            Nom
          </label>
          <input
            id="nom"
            type="text"
            className="auth-input"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            autoComplete="name"
            placeholder="Votre nom"
          />
        </div>

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
            autoComplete="new-password"
            minLength={8}
            placeholder="8 caracteres minimum"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="confirmation" className="auth-label">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmation"
            type="password"
            className="auth-input"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <button type="submit" className="auth-submit" disabled={chargement}>
          {chargement ? "Inscription en cours..." : "Creer mon compte"}
        </button>
      </form>

      <p className="auth-footer-text">
        Deja un compte ?{" "}
        <Link href="/connexion" className="auth-link">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
