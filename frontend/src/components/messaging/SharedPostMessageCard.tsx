import React from 'react';
import { Link } from 'react-router-dom';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

export type SharedPostMessageCardVariant = 'mine' | 'theirs' | 'preview';

export type SharedPostMessageCardProps = {
  sharedPostId: number;
  imageUrl?: string | null;
  authorFirst?: string | null;
  authorLast?: string | null;
  contentPreview?: string | null;
  badgeLabel: string;
  openLabel: string;
  emptyContentLabel: string;
  /** mine/theirs: tıklanınca /post/:id; preview: sadece görsel önizleme */
  variant: SharedPostMessageCardVariant;
  className?: string;
};

function cardShellClassName(variant: SharedPostMessageCardVariant): string {
  const base =
    'mb-2 block max-w-full overflow-hidden rounded-2xl border text-left transition';
  if (variant === 'mine') {
    return `${base} border-white/25 bg-black/20 hover:bg-black/30`;
  }
  if (variant === 'preview') {
    return `${base} border-slate-200/90 bg-slate-50 space:border-white/10 space:bg-slate-900/55 pointer-events-none opacity-95`;
  }
  return `${base} border-slate-200/90 bg-slate-50 hover:bg-slate-100 space:border-white/10 space:bg-slate-900/55 space:hover:bg-slate-900/75`;
}

function badgeClassName(variant: SharedPostMessageCardVariant): string {
  if (variant === 'mine') return 'text-indigo-200';
  return 'text-primary';
}

function authorClassName(variant: SharedPostMessageCardVariant): string {
  if (variant === 'mine') return 'text-white/95';
  return 'text-slate-800 space:text-slate-100';
}

function contentClassName(variant: SharedPostMessageCardVariant): string {
  if (variant === 'mine') return 'text-white/85';
  return 'text-slate-600 space:text-slate-300';
}

function openClassName(variant: SharedPostMessageCardVariant): string {
  if (variant === 'mine') return 'text-white/75';
  return 'text-primary';
}

const SharedPostMessageCard: React.FC<SharedPostMessageCardProps> = ({
  sharedPostId,
  imageUrl,
  authorFirst,
  authorLast,
  contentPreview,
  badgeLabel,
  openLabel,
  emptyContentLabel,
  variant,
  className = '',
}) => {
  const imgSrc = imageUrl ? resolveMediaUrl(imageUrl) : '';
  const authorLine = [authorFirst, authorLast].filter(Boolean).join(' ') || '—';
  const bodyText = (contentPreview || '').trim() || emptyContentLabel;
  const shell = `${cardShellClassName(variant)} ${className}`.trim();

  const inner = (
    <>
      {imgSrc ? (
        <div className="max-h-40 w-full overflow-hidden bg-black/10">
          <img src={imgSrc} alt="" className="max-h-40 w-full object-cover object-center" />
        </div>
      ) : null}
      <div className="px-3 py-2.5">
        <p className={`text-[10px] font-black uppercase tracking-widest ${badgeClassName(variant)}`}>{badgeLabel}</p>
        <p className={`mt-0.5 truncate text-xs font-bold ${authorClassName(variant)}`}>{authorLine}</p>
        <p className={`mt-1 line-clamp-3 text-sm leading-snug ${contentClassName(variant)}`}>{bodyText}</p>
        <p className={`mt-2 text-[11px] font-semibold ${openClassName(variant)}`}>{openLabel}</p>
      </div>
    </>
  );

  if (variant === 'preview') {
    return (
      <div className={shell} role="img" aria-label={badgeLabel}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={`/post/${sharedPostId}`} className={shell}>
      {inner}
    </Link>
  );
};

export default SharedPostMessageCard;
