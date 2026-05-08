type Props = {
  /** Unread count; badge hidden when ≤ 0 */
  count: number;
  /** Upper bound before showing "99+" */
  cap?: number;
  /** alerts = red (default), messages = violet */
  tone?: 'alerts' | 'messages';
  /**
   * navIcon = top-right overlap on a small icon (sidebar).
   * boxTopLeft = corner of a larger box (e.g. notification tab); text stays centered independently.
   */
  placement?: 'navIcon' | 'boxTopLeft';
};

/**
 * Corner badge for nav icons or tab cells. Slightly squared corners.
 */
export function NavIconBadge({ count, cap = 99, tone = 'alerts', placement = 'navIcon' }: Props) {
  if (count <= 0) return null;
  const label = count > cap ? `${cap}+` : String(count);
  const bg = tone === 'messages' ? 'bg-violet-600' : 'bg-red-600';
  const position =
    placement === 'boxTopLeft'
      ? 'pointer-events-none absolute left-1 top-1 z-20'
      : 'pointer-events-none absolute -right-0.5 -top-1 z-30';
  const ring = 'ring-2 ring-white';
  return (
    <span
      className={`${position} flex h-[19px] min-w-[19px] items-center justify-center rounded-md ${bg} px-[5px] text-[10px] font-black tabular-nums leading-none text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${ring}`}
      aria-hidden
    >
      {label}
    </span>
  );
}
