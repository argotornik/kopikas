// The kopikas coin: copper disc with a reeded inner ring. Shared by the
// board and Pooleks headers.
export function CoinMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="10" className="fill-primary" />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeDasharray="1.6 2.3"
      />
    </svg>
  );
}
