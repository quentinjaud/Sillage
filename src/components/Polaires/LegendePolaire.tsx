'use client';

import type { ActionEditeur, PolaireReference } from '@/lib/polaires/types';
import { COULEURS_TWS } from '@/lib/polaires/constantes';

interface PropsLegende {
  tws: number[];
  visibleTWS: Set<number>;
  montrerApparent: boolean;
  refPolaire: PolaireReference | null;
  dispatch: React.Dispatch<ActionEditeur>;
}

export function SidebarTWS({
  tws,
  visibleTWS,
  montrerApparent,
  dispatch,
}: Pick<PropsLegende, 'tws' | 'visibleTWS' | 'montrerApparent' | 'dispatch'>) {
  return (
    <div className="polaires-legende__sidebar">
      {tws.map((v, ci) => {
        if (v === 0) return null;
        const couleur = COULEURS_TWS[ci % COULEURS_TWS.length];
        const actif = visibleTWS.has(ci);
        return (
          <span
            key={ci}
            className={`polaires-legende__tws${actif ? ' polaires-legende__tws--actif' : ''}`}
            style={actif ? { color: couleur } : undefined}
            onClick={() => dispatch({ type: 'TOGGLE_TWS', ci })}
          >
            <span className="polaires-legende__tiret" style={{ background: couleur }} />
            {v}
          </span>
        );
      })}
      <div className="polaires-legende__sidebar-controls">
        <span
          className="polaires-legende__tws polaires-legende__tws--ctrl"
          onClick={() => dispatch({ type: 'TOUT_TWS' })}
        >
          Tout
        </span>
        <span
          className="polaires-legende__tws polaires-legende__tws--ctrl"
          onClick={() => dispatch({ type: 'AUCUN_TWS' })}
        >
          Aucun
        </span>
        <span
          className={`polaires-legende__tws polaires-legende__tws--ctrl${montrerApparent ? ' polaires-legende__tws--actif' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_APPARENT' })}
        >
          App.
        </span>
      </div>
    </div>
  );
}

export default function LegendePolaire({
  tws,
  visibleTWS,
  montrerApparent,
  refPolaire,
  dispatch,
}: PropsLegende) {
  return (
    <div className="polaires-legende">
      <div className="polaires-legende__controls">
        <button
          className="polaires-pill polaires-pill--small"
          onClick={() => dispatch({ type: 'TOUT_TWS' })}
        >
          Tout
        </button>
        <button
          className="polaires-pill polaires-pill--small"
          onClick={() => dispatch({ type: 'AUCUN_TWS' })}
        >
          Aucun
        </button>
        <label className="polaires-legende__item polaires-legende__item--apparent">
          <input
            type="checkbox"
            checked={montrerApparent}
            onChange={() => dispatch({ type: 'TOGGLE_APPARENT' })}
          />
          <svg width="20" height="4" className="polaires-legende__color--apparent">
            <line
              x1="0"
              y1="2"
              x2="20"
              y2="2"
              stroke="#777"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="0.1 4"
            />
          </svg>
          Apparent
        </label>
      </div>

      {refPolaire && (
        <div className="polaires-legende__ref">
          Ref : {refPolaire.nom}
        </div>
      )}
    </div>
  );
}
