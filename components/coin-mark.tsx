// The kopikas coin: a copper disc with a lowercase k struck into it — the
// wordmark's own letter (Bricolage Grotesque 700), as an outline so no
// font needs to load. The ink is the dark board's colour on every theme,
// so on the dark board the k reads as a hole in the coin.
export function CoinMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-5 shrink-0" aria-hidden="true">
      <circle cx="16" cy="16" r="15" className="fill-primary" />
      <path fill="#1c2433" d="M11.18 23.6 L11.18 8.59 L14.16 8.59 L14.16 16.92 Q14.81 16.48 15.41 15.96 Q16.01 15.45 16.51 14.88 Q17.0 14.32 17.38 13.73 Q17.77 13.14 18.05 12.58 L21.51 12.58 Q21.2 13.37 20.69 14.18 Q20.17 14.99 19.47 15.68 Q18.76 16.36 17.84 16.84 Q16.91 17.32 15.8 17.49 L15.8 17.85 Q17.21 17.59 18.13 17.88 Q19.06 18.18 19.66 18.82 Q20.25 19.46 20.61 20.29 Q20.97 21.12 21.26 21.96 L21.74 23.6 L18.45 23.6 L18.17 22.57 Q17.88 21.54 17.52 20.77 Q17.17 19.99 16.59 19.56 Q16.01 19.13 15.0 19.13 L14.16 19.13 L14.16 23.6 L11.18 23.6 Z" />
    </svg>
  );
}
