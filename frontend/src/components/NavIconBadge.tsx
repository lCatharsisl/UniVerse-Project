type Props = {
  /** Unread count; badge hidden when ≤ 0 */
  count: number;
  /** Upper bound before showing "99+" */
  cap?: number;
  /** alerts = red (default), messages = violet */
  tone?: 'alerts' | 'messages';
};

/**
 * Corner badge for nav icons. Slightly squared corners, top-right overlap.
 */
export function NavIconBadge({ count, cap = 99, tone = 'alerts' }: Props) {
  if (count <= 0) return null;
  const label = count > cap ? `${cap}+` : String(count);
  const bg = tone === 'messages' ? 'bg-violet-600' : 'bg-red-600';
  return (
    <span
      className={`pointer-events-none absolute -right-0.5 -top-1 z-30 flex h-[19px] min-w-[19px] items-center justify-center rounded-md ${bg} px-[5px] text-[10px] font-black tabular-nums leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ring-2 ring-white`}
      aria-hidden
    >
      {label}
    </span>
  );
}
