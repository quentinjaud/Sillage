"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ChevronRight, ChevronDown, Plus } from "lucide-react";
import type { ResumeDossier, ResumeNavigation, ContenuDossier } from "@/lib/types";
import { formaterDistance, formaterDuree } from "@/lib/utilitaires";

// --- Types ---

type FiltreType = "" | "SOLO" | "AVENTURE" | "REGATE";

interface PropsArborescenceJournal {
  dossiers: ResumeDossier[];
  navActiveId: string | null;
  onClicNavigation: (nav: ResumeNavigation) => void;
  onCreerDossier: () => void;
  onCreerNav: (dossierId: string) => void;
}

const COULEURS_TYPE: Record<string, string> = {
  SOLO: "var(--accent)",
  AVENTURE: "var(--accent-aventure)",
  REGATE: "var(--accent-yellow)",
};

const LABELS_FILTRE: { valeur: FiltreType; label: string }[] = [
  { valeur: "", label: "Tous" },
  { valeur: "SOLO", label: "Solo" },
  { valeur: "AVENTURE", label: "Aventure" },
  { valeur: "REGATE", label: "Regate" },
];

// --- Composant principal ---

export default function ArborescenceJournal({
  dossiers,
  navActiveId,
  onClicNavigation,
  onCreerDossier,
  onCreerNav,
}: PropsArborescenceJournal) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltreType>("");
  const [dossiersOuverts, setDossiersOuverts] = useState<Set<string>>(
    () => new Set(dossiers.map((d) => d.id))
  );
  const [contenus, setContenus] = useState<Map<string, ContenuDossier>>(
    new Map()
  );
  const [chargement, setChargement] = useState<Set<string>>(new Set());

  // Charger le contenu d'un dossier
  const chargerContenu = useCallback(
    async (dossierId: string) => {
      if (contenus.has(dossierId) || chargement.has(dossierId)) return;
      setChargement((prev) => new Set(prev).add(dossierId));
      try {
        const res = await fetch(`/api/journal/dossiers/${dossierId}/contenu`);
        if (res.ok) {
          const data: ContenuDossier = await res.json();
          setContenus((prev) => new Map(prev).set(dossierId, data));
        }
      } finally {
        setChargement((prev) => {
          const next = new Set(prev);
          next.delete(dossierId);
          return next;
        });
      }
    },
    [contenus, chargement]
  );

  // Charger tous les dossiers au montage
  useEffect(() => {
    for (const d of dossiers) {
      chargerContenu(d.id);
    }
  }, [dossiers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle ouvert/ferme
  const toggleDossier = useCallback((id: string) => {
    setDossiersOuverts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Recherche lowercase
  const termeRecherche = recherche.trim().toLowerCase();

  return (
    <div className="arbo-panel">
      {/* Header avec titre */}
      <div className="arbo-header">
        <span className="arbo-titre">Journaux de bord</span>
        <button
          className="arbo-btn-ajouter"
          onClick={onCreerDossier}
          title="Nouveau dossier"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="arbo-recherche">
        <Search size={13} className="arbo-recherche-icon" />
        <input
          className="arbo-recherche-input"
          type="text"
          placeholder="Rechercher..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </div>

      {/* Filtres par type */}
      <div className="arbo-filtres">
        {LABELS_FILTRE.map(({ valeur, label }) => (
          <button
            key={valeur}
            className={`arbo-filtre ${filtre === valeur ? "arbo-filtre-actif" : ""}`}
            onClick={() => setFiltre(filtre === valeur ? "" : valeur)}
          >
            {valeur && (
              <span
                className="arbo-filtre-dot"
                style={{ background: COULEURS_TYPE[valeur] }}
              />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Arborescence */}
      <div className="arbo-tree">
        {dossiers.length === 0 ? (
          <div className="arbo-vide">
            <p>Bienvenue Marin !</p>
            <p>Cree ton premier dossier pour commencer.</p>
            <button className="btn-principal" onClick={onCreerDossier}>
              Creer un dossier
            </button>
          </div>
        ) : (
          dossiers.map((dossier) => (
            <NoeudDossier
              key={dossier.id}
              dossier={dossier}
              contenu={contenus.get(dossier.id)}
              ouvert={dossiersOuverts.has(dossier.id)}
              enChargement={chargement.has(dossier.id)}
              navActiveId={navActiveId}
              termeRecherche={termeRecherche}
              filtre={filtre}
              onToggle={toggleDossier}
              onClicNavigation={onClicNavigation}
              onCreerNav={onCreerNav}
              profondeur={0}
            />
          ))
        )}
      </div>
    </div>
  );
}

// --- Noeud dossier ---

function NoeudDossier({
  dossier,
  contenu,
  ouvert,
  enChargement,
  navActiveId,
  termeRecherche,
  filtre,
  onToggle,
  onClicNavigation,
  onCreerNav,
  profondeur,
}: {
  dossier: ResumeDossier;
  contenu: ContenuDossier | undefined;
  ouvert: boolean;
  enChargement: boolean;
  navActiveId: string | null;
  termeRecherche: string;
  filtre: FiltreType;
  onToggle: (id: string) => void;
  onClicNavigation: (nav: ResumeNavigation) => void;
  onCreerNav: (dossierId: string) => void;
  profondeur: number;
}) {
  // Filtrer les navigations
  const navsFiltrees = useMemo(() => {
    if (!contenu) return [];
    return contenu.navigations.filter((nav) => {
      if (filtre && nav.type !== filtre) return false;
      if (termeRecherche && !nav.nom.toLowerCase().includes(termeRecherche))
        return false;
      return true;
    });
  }, [contenu, filtre, termeRecherche]);

  // Si recherche/filtre actif et rien ne match, masquer le dossier
  const aDesResultats =
    navsFiltrees.length > 0 ||
    (contenu?.sousDossiers?.length ?? 0) > 0 ||
    (!termeRecherche && !filtre);

  if ((termeRecherche || filtre) && !aDesResultats) return null;

  const total = dossier.nbNavigations + dossier.nbSousDossiers;
  const Chevron = ouvert ? ChevronDown : ChevronRight;

  return (
    <div className="arbo-noeud">
      <button
        className="arbo-dossier"
        style={{ paddingLeft: `${16 + profondeur * 16}px` }}
        onClick={() => onToggle(dossier.id)}
      >
        <Chevron size={14} className="arbo-chevron" />
        <span className="arbo-dossier-nom">{dossier.nom}</span>
        <span className="arbo-dossier-count">{total}</span>
      </button>

      {ouvert && (
        <div className="arbo-enfants">
          {enChargement ? (
            <div
              className="arbo-chargement"
              style={{ paddingLeft: `${32 + profondeur * 16}px` }}
            >
              ...
            </div>
          ) : (
            <>
              {navsFiltrees.map((nav) => (
                <NoeudNavigation
                  key={nav.id}
                  nav={nav}
                  actif={nav.id === navActiveId}
                  navActiveId={navActiveId}
                  onClick={onClicNavigation}
                  profondeur={profondeur + 1}
                />
              ))}
              {navsFiltrees.length === 0 && !termeRecherche && !filtre && (
                <button
                  className="arbo-ajouter-nav"
                  style={{ paddingLeft: `${32 + profondeur * 16}px` }}
                  onClick={() => onCreerNav(dossier.id)}
                >
                  + Ajouter une navigation
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Noeud navigation (+ depliable pour aventures) ---

function NoeudNavigation({
  nav,
  actif,
  navActiveId,
  onClick,
  profondeur,
}: {
  nav: ResumeNavigation;
  actif: boolean;
  navActiveId: string | null;
  onClick: (nav: ResumeNavigation) => void;
  profondeur: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [sousNavs, setSousNavs] = useState<ResumeNavigation[] | null>(null);
  const [chargement, setChargement] = useState(false);

  const estAventure = nav.type === "AVENTURE" && nav.nbSousNavs > 0;
  const couleur = COULEURS_TYPE[nav.type] ?? "var(--accent)";
  const distance = nav.trace?.distanceNm;
  const date = new Date(nav.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  const toggleAventure = useCallback(async () => {
    if (!ouvert && !sousNavs && !chargement) {
      setChargement(true);
      try {
        const res = await fetch(`/api/journal/navigations/${nav.id}`);
        if (res.ok) {
          const data = await res.json();
          setSousNavs(
            (data.sousNavigations ?? []).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (sn: any): ResumeNavigation => ({
                id: sn.id,
                nom: sn.nom,
                date: sn.date,
                type: sn.type,
                dossierId: sn.dossierId,
                parentNavId: sn.parentNavId,
                nbSousNavs: sn.sousNavigations?.length ?? sn._count?.sousNavigations ?? 0,
                trace: sn.trace
                  ? {
                      id: sn.trace.id,
                      name: sn.trace.name,
                      distanceNm: sn.trace.distanceNm,
                      durationSeconds: sn.trace.durationSeconds,
                      avgSpeedKn: sn.trace.avgSpeedKn,
                      maxSpeedKn: sn.trace.maxSpeedKn,
                      polylineSimplifiee: sn.trace.polylineSimplifiee ?? null,
                      bateau: sn.trace.bateau ?? null,
                    }
                  : null,
                polylineCache: sn.polylineCache ?? null,
                createdAt: sn.createdAt,
              })
            )
          );
        }
      } finally {
        setChargement(false);
      }
    }
    setOuvert((prev) => !prev);
  }, [ouvert, sousNavs, chargement, nav.id]);

  const Chevron = ouvert ? ChevronDown : ChevronRight;

  return (
    <div className="arbo-noeud">
      <div
        className={`arbo-nav ${actif ? "arbo-nav-actif" : ""}`}
        style={{ paddingLeft: `${32 + profondeur * 16}px` }}
      >
        {estAventure ? (
          <button
            className="arbo-chevron-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleAventure();
            }}
          >
            <Chevron size={12} className="arbo-chevron" />
          </button>
        ) : (
          <span className="arbo-nav-dot" style={{ background: couleur }} />
        )}
        <button
          className="arbo-nav-clickable"
          onClick={() => onClick(nav)}
        >
          {estAventure && (
            <span className="arbo-nav-dot" style={{ background: couleur }} />
          )}
          <span className="arbo-nav-nom">{nav.nom}</span>
          <span className="arbo-nav-meta">
            {date}
            {distance != null && ` · ${formaterDistance(distance)}`}
            {estAventure && ` · ${nav.nbSousNavs} navs`}
          </span>
        </button>
      </div>

      {estAventure && ouvert && (
        <div className="arbo-enfants">
          {chargement ? (
            <div
              className="arbo-chargement"
              style={{ paddingLeft: `${48 + profondeur * 16}px` }}
            >
              ...
            </div>
          ) : (
            sousNavs?.map((sn) => (
              <NoeudNavigation
                key={sn.id}
                nav={sn}
                actif={sn.id === navActiveId}
                navActiveId={navActiveId}
                onClick={onClick}
                profondeur={profondeur + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
