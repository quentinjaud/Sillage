"use client";

import { useCallback, useRef, useState } from "react";

interface PropsFormulaireEntree {
  onSave: (texte: string) => Promise<void>;
  onCancel: () => void;
  texteInitial?: string;
}

export default function FormulaireEntree({
  onSave,
  onCancel,
  texteInitial = "",
}: PropsFormulaireEntree) {
  const [texte, setTexte] = useState(texteInitial);
  const [enCours, setEnCours] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = useCallback(async () => {
    const t = texte.trim();
    if (!t) return;
    setEnCours(true);
    try {
      await onSave(t);
    } finally {
      setEnCours(false);
    }
  }, [texte, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  return (
    <div className="formulaire-entree">
      <textarea
        ref={textareaRef}
        className="formulaire-entree-textarea"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Votre note de navigation..."
        autoFocus
        rows={3}
      />
      <div className="formulaire-entree-actions">
        <button
          className="formulaire-entree-btn annuler"
          onClick={onCancel}
          disabled={enCours}
        >
          Annuler
        </button>
        <button
          className="formulaire-entree-btn sauver"
          onClick={handleSave}
          disabled={enCours || !texte.trim()}
        >
          {enCours ? "..." : "Sauvegarder"}
        </button>
      </div>
      <p className="formulaire-entree-hint">Ctrl+Entree pour sauvegarder</p>
    </div>
  );
}
