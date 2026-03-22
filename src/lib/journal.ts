/** Journal d'erreurs minimal pour le debugging en production */
export function journalErreur(contexte: string, erreur: unknown): void {
  const message = erreur instanceof Error ? erreur.message : String(erreur);
  const pile = erreur instanceof Error ? erreur.stack : undefined;
  console.error(`[Sillage][${contexte}] ${message}`, pile ? `\n${pile}` : "");
}

/** Journal d'avertissements */
export function journalAvertissement(contexte: string, message: string): void {
  console.warn(`[Sillage][${contexte}] ${message}`);
}
