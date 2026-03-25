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
          className="polaires-btn polaires-btn--small"
          onClick={() => dispatch({ type: 'TOUT_TWS' })}
        >
          Tout
        </button>
        <button
          className="polaires-btn polaires-btn--small"
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

      <div className="polaires-legende__items">
        {tws.map((v, ci) => {
          if (v === 0) return null;
          const couleur = COULEURS_TWS[ci % COULEURS_TWS.length];
          return (
            <label key={ci} className="polaires-legende__item">
              <input
                type="checkbox"
                checked={visibleTWS.has(ci)}
                onChange={() => dispatch({ type: 'TOGGLE_TWS', ci })}
              />
              <span
                className="polaires-legende__color"
                style={{ background: couleur }}
              />
              {v} kn
            </label>
          );
        })}
      </div>

      {refPolaire && (
        <div className="polaires-legende__ref">
          Ref : {refPolaire.nom}
        </div>
      )}
    </div>
  );
}
