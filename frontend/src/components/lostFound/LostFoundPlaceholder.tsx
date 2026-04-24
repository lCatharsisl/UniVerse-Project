export type LostFoundVisualKind = 'lost' | 'found' | 'resolved';

const baseSvg = 'w-full h-full max-w-[56px] max-h-[56px]';

/** Fotoğraf yok veya yüklenemediğinde kırık görsel yerine tutarlı SVG */
export function LostFoundPlaceholder({ kind, className = '' }: { kind: LostFoundVisualKind; className?: string }) {
  const wrap = `${baseSvg} ${className}`.trim();

  if (kind === 'lost') {
    return (
      <svg viewBox="0 0 64 64" className={wrap} aria-hidden>
        <rect x="4" y="4" width="56" height="56" rx="12" fill="currentColor" className="text-primary/15" />
        <circle cx="28" cy="26" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-primary/70" />
        <path d="M36 34 L48 46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary/70" />
      </svg>
    );
  }

  if (kind === 'found') {
    return (
      <svg viewBox="0 0 64 64" className={wrap} aria-hidden>
        <rect x="4" y="4" width="56" height="56" rx="12" fill="currentColor" className="text-emerald-500/15" />
        <path
          d="M20 30 L28 38 L44 22"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="text-emerald-600/85"
        />
        <rect x="18" y="42" width="28" height="8" rx="2" fill="currentColor" className="text-emerald-600/40" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={wrap} aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="12" fill="currentColor" className="text-violet-500/15" />
      <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-violet-600/75" />
      <path d="M24 32 L30 38 L40 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" className="text-violet-600/90" />
    </svg>
  );
}
