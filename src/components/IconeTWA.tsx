/** Icone TWA — bateau decoupe par le vent, rotation +45°. */
export function IconeTWA({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ transform: "rotate(45deg)" }}
    >
      <defs>
        <mask id="twa-m">
          <rect width="24" height="24" fill="white" />
          <g transform="rotate(-20 12 12) scale(0.8) translate(0 4)">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" stroke="black" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2" stroke="black" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2" stroke="black" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </mask>
      </defs>
      <g mask="url(#twa-m)">
        <path fillRule="evenodd" clipRule="evenodd" d="M11.49 1.809a.5.5 0 0 1 .879-.008l1.517 2.726a19.999 19.999 0 0 1 2.358 7.151l.295 2.278c.305 2.346.19 4.729-.337 7.035l-.098.43a2 2 0 0 1-1.941 1.553l-4.31.019a2 2 0 0 1-1.959-1.556l-.104-.458a20 20 0 0 1-.331-7.01l.32-2.469a20 20 0 0 1 2.193-6.847L11.49 1.81Z" fill="currentColor" transform="scale(1.15) translate(-1 -1)" />
      </g>
      <g transform="rotate(-20 12 12) scale(0.8) translate(0 4)">
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
