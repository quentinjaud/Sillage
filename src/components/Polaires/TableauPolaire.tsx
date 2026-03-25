'use client';

import { useCallback, useRef } from 'react';
import type { ActionEditeur, PolaireReference } from '@/lib/polaires/types';
import { getRefSpeed } from '@/lib/polaires/interpolation';

interface PropsTableau {
  tws: number[];
  twa: number[];
  speeds: number[][];
  visibleTWS: Set<number>;
  ref_polaire: PolaireReference | null;
  modeRef: 'absolu' | 'delta';
  dispatch: React.Dispatch<ActionEditeur>;
}

export default function TableauPolaire({
  tws,
  twa,
  speeds,
  visibleTWS,
  ref_polaire,
  modeRef,
  dispatch,
}: PropsTableau) {
  // Stocke la valeur precedente au focus pour revert sur Escape
  const valeurPrecedente = useRef('');

  const gererBlur = useCallback(
    (ri: number, ci: number, e: React.FocusEvent<HTMLInputElement>) => {
      const td = e.target.parentElement as HTMLElement | null;
      const raw = e.target.value.trim().replace(',', '.');
      const val = parseFloat(raw);

      if (isNaN(val) || val < 0) {
        // Invalide : flash rouge et revert
        e.target.value = speeds[ri][ci].toFixed(1);
        if (td) {
          td.classList.add('invalid');
          setTimeout(() => td.classList.remove('invalid'), 500);
        }
        return;
      }

      // Ne dispatcher que si la valeur a change
      if (val !== speeds[ri][ci]) {
        dispatch({ type: 'MODIFIER_VITESSE', ri, ci, valeur: val });
      } else {
        // Reformater proprement
        e.target.value = val.toFixed(1);
      }
    },
    [speeds, dispatch],
  );

  const gererKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
      if (e.key === 'Escape') {
        e.currentTarget.value = valeurPrecedente.current;
        e.currentTarget.blur();
      }
    },
    [],
  );

  const gererFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    valeurPrecedente.current = e.target.value;
    e.target.select();
  }, []);

  // Classe de mode ref sur le tableau
  const classeRef = ref_polaire
    ? modeRef === 'absolu'
      ? 'polaires-ref-absolu'
      : 'polaires-ref-delta'
    : '';

  return (
    <table className={`polaires-table ${classeRef}`.trim()}>
      <thead>
        <tr>
          <th className="corner">TWA \ TWS</th>
          {tws.map((v, ci) => {
            if (v === 0) return null;
            const estDimmed = !visibleTWS.has(ci);
            return (
              <th key={`tws-${ci}`} className={estDimmed ? 'dimmed' : undefined}>
                <span className="cell-value">{v}</span>
                <button
                  className="polaires-btn--del"
                  title={`Supprimer TWS=${v}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'SUPPRIMER_TWS', ci });
                  }}
                >
                  &times;
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {twa.map((angle, ri) => {
          if (angle === 0) return null;
          return (
            <tr key={`twa-${ri}`}>
              <td>
                <span className="cell-value">{angle}</span>
                <button
                  className="polaires-btn--del"
                  title={`Supprimer TWA=${angle}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'SUPPRIMER_TWA', ri });
                  }}
                >
                  &times;
                </button>
              </td>
              {speeds[ri].map((spd, ci) => {
                if (tws[ci] === 0) return null;
                const estDimmed = !visibleTWS.has(ci);

                // Reference
                let refContenu: React.ReactNode = null;
                if (ref_polaire) {
                  const refSpd = getRefSpeed(ref_polaire, angle, tws[ci]);
                  if (refSpd !== null) {
                    const diff = spd - refSpd;
                    if (modeRef === 'absolu') {
                      refContenu = (
                        <span className="polaires-ref-value">
                          {refSpd.toFixed(1)}
                        </span>
                      );
                    } else {
                      // Delta
                      let signe: 'faster' | 'slower' | 'equal';
                      let texte: string;
                      if (Math.abs(diff) >= 0.05) {
                        if (diff > 0) {
                          signe = 'faster';
                          texte = `\u25B4${Math.abs(diff).toFixed(1)}`;
                        } else {
                          signe = 'slower';
                          texte = `\u25BE${Math.abs(diff).toFixed(1)}`;
                        }
                      } else {
                        signe = 'equal';
                        texte = '=';
                      }
                      refContenu = (
                        <span
                          className="polaires-delta"
                          data-delta-sign={signe}
                        >
                          {texte}
                        </span>
                      );
                    }
                  }
                }

                return (
                  <td
                    key={`${ri}-${ci}`}
                    className={estDimmed ? 'dimmed' : undefined}
                  >
                    <input
                      type="text"
                      className="polaires-cell-input"
                      defaultValue={spd.toFixed(1)}
                      // Re-sync si la valeur change depuis l'exterieur
                      key={`input-${ri}-${ci}-${spd}`}
                      onFocus={gererFocus}
                      onBlur={(e) => gererBlur(ri, ci, e)}
                      onKeyDown={gererKeyDown}
                    />
                    {refContenu}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
