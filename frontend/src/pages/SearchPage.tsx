import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiUser, FiHash, FiUsers, FiVideo, FiImage } from 'react-icons/fi';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { FeedAvatarImage } from '../components/FeedAvatarImage';
import { toImgSrc } from '../utils/resolveMediaUrl';
import { isPostVideoUrl, resolveSocialPostMediaUrl } from '../utils/postMedia';

type SearchType = 'top' | 'users' | 'posts' | 'communities';
type SearchSort = 'relevance' | 'latest';

type UserHit = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_private: boolean;
  _score: number;
  highlight?: string;
  avatar_url?: string | null;
};
type PostHit = {
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  _score: number;
  image_url?: string | null;
  author_avatar?: string | null;
  author_display?: string | null;
};
type CommunityHit = {
  community_id: number;
  community_name: string;
  description: string;
  category_codes: string[];
  _score: number;
  avatar_url?: string | null;
  cover_url?: string | null;
};

type SearchResponse =
  | {
      top: { users: UserHit[]; posts: PostHit[]; communities: CommunityHit[] };
      highlights: { posts: Record<string, string[]> };
    }
  | { users: UserHit[]; nextCursor?: string }
  | { posts: PostHit[]; highlights: Record<string, string[]>; nextCursor?: string }
  | { communities: CommunityHit[]; nextCursor?: string };

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) {
    const words = first.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return first[0].toUpperCase();
  }
  const local = email?.split('@')[0] || '';
  const letter = local.match(/\p{L}/u);
  return letter ? letter[0].toUpperCase() : '?';
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SearchPage: React.FC = () => {
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q0 = searchParams.get('q') || '';

  const [q, setQ] = useState(q0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);

  useEffect(() => {
    setQ(q0);
  }, [q0]);

  const urlType = (searchParams.get('type') as SearchType) || 'top';
  const urlSort = (searchParams.get('sort') as SearchSort) || 'relevance';

  useEffect(() => {
    const queryStr = q0.trim();
    if (!queryStr) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<SearchResponse>('/search', {
          params: {
            q: queryStr,
            type: urlType,
            sort: urlType === 'posts' ? urlSort : 'relevance',
            limit: urlType === 'top' ? 8 : 15,
          },
        });
        if (!cancelled) setData(res.data);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { response?: { status?: number; data?: { error?: string } } };
        setError(err.response?.data?.error || t('searchPage.failed'));
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q0, urlType, urlSort, t]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = q.trim();
    if (!queryStr) return;
    setSearchParams({
      q: queryStr,
      type: urlType,
      sort: urlType === 'posts' ? urlSort : 'relevance',
    });
  };

  const tabBtn = (id: SearchType, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => {
        if (q.trim()) {
          setSearchParams({
            q: q.trim(),
            type: id,
            sort: id === 'posts' ? urlSort : 'relevance',
          });
        } else {
          setSearchParams({ type: id, sort: id === 'posts' ? urlSort : 'relevance' });
        }
      }}
      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all md:text-sm ${
        urlType === id
          ? isSpace
            ? 'bg-primary text-white'
            : 'bg-primary text-white shadow-md'
          : isSpace
            ? 'bg-white/10 text-white/70 hover:bg-white/15'
            : 'bg-uv-border/50 text-uv-gray hover:bg-uv-border'
      }`}
    >
      {label}
    </button>
  );

  const userCard = (u: UserHit, key: string | number) => {
    const avatarSrc = toImgSrc(u.avatar_url);
    const initials = getInitials(u.first_name, u.last_name, u.email);
    return (
      <li key={key}>
        <button
          type="button"
          onClick={() => navigate(`/profile/${u.user_id}`)}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:shadow-md ${
            isSpace
              ? 'border-white/10 bg-gradient-to-r from-white/10 to-white/5 hover:border-primary/30'
              : 'border-uv-border/80 bg-gradient-to-r from-white to-slate-50/90 hover:border-primary/25'
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 ${
              isSpace ? 'border-white/20 bg-white/10' : 'border-white bg-slate-100 shadow-sm'
            }`}
          >
            <FeedAvatarImage
              src={avatarSrc}
              initials={initials}
              className="bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white"
              imgClassName="h-full w-full object-cover"
              alt=""
            />
          </div>
          <div className="min-w-0 flex-1">
            {u.highlight ? (
              <div
                className={`line-clamp-2 text-sm font-bold ${isSpace ? 'text-white' : 'text-uv-black'}`}
                dangerouslySetInnerHTML={{ __html: u.highlight }}
              />
            ) : (
              <div className={`text-sm font-bold ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {u.first_name} {u.last_name}
              </div>
            )}
            <div className="mt-0.5 text-xs text-uv-gray">@{u.email.split('@')[0]}</div>
            {u.is_private && (
              <span className="mt-0.5 inline-block text-[10px] text-uv-gray">· {t('searchPage.privateUser')}</span>
            )}
          </div>
        </button>
      </li>
    );
  };

  const postCard = (p: PostHit, highlightHtml: string | undefined, key: string | number) => {
    const authorSrc = toImgSrc(p.author_avatar);
    const authorLabel = p.author_display || t('searchPage.unknownUser');
    const authorInitials = (authorLabel.slice(0, 2) || '?').toUpperCase();
    const mediaRaw = p.image_url || null;
    const showThumb = Boolean(mediaRaw);
    const isVideo = isPostVideoUrl(mediaRaw);
    const thumbUrl = showThumb ? resolveSocialPostMediaUrl(mediaRaw!) : '';
    const hasThumb = Boolean(thumbUrl?.trim());

    return (
      <li key={key}>
        <button
          type="button"
          onClick={() => navigate(`/post/${p.post_id}`)}
          className={`flex w-full gap-3 overflow-hidden rounded-2xl border p-3 text-left transition hover:shadow-md ${
            isSpace
              ? 'border-white/10 bg-gradient-to-br from-white/10 to-white/[0.04] hover:border-primary/30'
              : 'border-uv-border/80 bg-gradient-to-br from-white to-slate-50/80 hover:border-primary/20'
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border ${
              isSpace ? 'border-white/20' : 'border-slate-200'
            }`}
          >
            <FeedAvatarImage
              src={authorSrc}
              initials={authorInitials}
              className="bg-gradient-to-br from-slate-500 to-slate-700 text-xs font-bold text-white"
              alt=""
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`line-clamp-1 text-xs font-bold ${isSpace ? 'text-white' : 'text-uv-black'}`}>
              {authorLabel}
            </div>
            <div className="text-[10px] text-uv-gray">{formatTime(p.created_at)}</div>
            <div
              className={`mt-1 line-clamp-2 text-sm ${isSpace ? 'text-white/90' : 'text-uv-black/90'}`}
            >
              {highlightHtml ? (
                <span dangerouslySetInnerHTML={{ __html: highlightHtml }} />
              ) : (
                p.content
              )}
            </div>
          </div>
          {showThumb && (
            <div
              className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border ${
                isSpace ? 'border-white/10 bg-black/20' : 'border-uv-border bg-slate-100'
              }`}
            >
              {isVideo ? (
                <div className="flex h-full w-full items-center justify-center text-indigo-500/80">
                  <FiVideo size={22} />
                </div>
              ) : hasThumb ? (
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <FiImage size={20} />
                </div>
              )}
            </div>
          )}
        </button>
      </li>
    );
  };

  const communityCard = (c: CommunityHit, key: string | number) => {
    const cover = toImgSrc(c.cover_url);
    const av = toImgSrc(c.avatar_url);
    const initial = (c.community_name?.trim()?.[0] || '?').toUpperCase();

    return (
      <li key={key}>
        <button
          type="button"
          onClick={() => navigate(`/community/${c.community_id}`)}
          className={`w-full overflow-hidden rounded-2xl border text-left transition hover:shadow-lg ${
            isSpace
              ? 'border-white/10 bg-white/[0.06] hover:border-primary/30'
              : 'border-uv-border/80 bg-white hover:border-primary/20'
          }`}
        >
          {cover ? (
            <div
              className="h-20 w-full bg-slate-200 bg-cover bg-center"
              style={{ backgroundImage: `url(${cover})` }}
            />
          ) : null}
          <div className={`flex gap-3 p-3 ${cover ? '-mt-7 pt-0' : ''}`}>
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 shadow-md ${
                cover
                  ? isSpace
                    ? 'border-[#0a0a1a] bg-slate-800'
                    : 'border-white bg-white'
                  : isSpace
                    ? 'border-white/20 bg-white/10'
                    : 'border-uv-border bg-slate-100'
              }`}
            >
              <FeedAvatarImage
                src={av || undefined}
                initials={initial}
                className="bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-black text-white"
                imgClassName="h-full w-full object-cover"
                alt=""
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className={`font-bold ${isSpace ? 'text-white' : 'text-uv-black'}`}>{c.community_name}</div>
              {c.description && (
                <div className="mt-0.5 line-clamp-2 text-xs text-uv-gray">{c.description}</div>
              )}
            </div>
          </div>
        </button>
      </li>
    );
  };

  return (
    <div className="min-h-0 w-full min-w-0 max-w-full pb-24 md:pb-10">
      <div className="border-b border-uv-border/60 p-3 md:p-5">
        <h1
          className={`text-2xl font-black tracking-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}
        >
          {t('searchPage.title')}
        </h1>
        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={`flex flex-1 items-center gap-2 rounded-2xl border px-3 py-2.5 ${
              isSpace ? 'border-white/20 bg-white/5' : 'border-uv-border bg-white'
            }`}
          >
            <FiSearch className={isSpace ? 'text-white/50' : 'text-uv-gray'} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('searchPage.placeholder')}
              className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                isSpace ? 'text-white placeholder:text-white/40' : 'text-uv-black'
              }`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {urlType === 'posts' && (
              <select
                value={urlSort}
                onChange={(e) => {
                  const s = e.target.value as SearchSort;
                  if (q.trim()) {
                    setSearchParams({ q: q.trim(), type: 'posts', sort: s });
                  } else {
                    setSearchParams({ type: 'posts', sort: s });
                  }
                }}
                className={`rounded-xl border px-2 py-2 text-sm font-bold ${
                  isSpace ? 'border-white/20 bg-white/10 text-white' : 'border-uv-border bg-white'
                }`}
              >
                <option value="relevance">{t('searchPage.sortRelevance')}</option>
                <option value="latest">{t('searchPage.sortLatest')}</option>
              </select>
            )}
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20"
            >
              {t('searchPage.runSearch')}
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {tabBtn('top', t('searchPage.tabTop'))}
          {tabBtn('users', t('searchPage.tabUsers'))}
          {tabBtn('posts', t('searchPage.tabPosts'))}
          {tabBtn('communities', t('searchPage.tabCommunities'))}
        </div>
      </div>

      {error && <div className="p-4 text-sm text-red-500">{error}</div>}
      {loading && <div className="p-6 text-sm text-uv-gray">{t('searchPage.loading')}</div>}

      {!loading && !error && data && 'top' in data && (
        <div className="space-y-8 p-3 md:p-5">
          <section
            className={`rounded-2xl p-1 md:p-2 ${isSpace ? 'bg-white/[0.04]' : 'bg-slate-50/50'}`}
          >
            <h2
              className={`mb-3 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-widest ${
                isSpace ? 'text-white/60' : 'text-uv-gray'
              }`}
            >
              <FiUser size={16} /> {t('searchPage.tabUsers')}
            </h2>
            {data.top.users.length === 0 ? (
              <p className="px-1 text-sm text-uv-gray">{t('searchPage.empty')}</p>
            ) : (
              <ul className="space-y-2">{data.top.users.map((u) => userCard(u, u.user_id))}</ul>
            )}
          </section>
          <section
            className={`rounded-2xl p-1 md:p-2 ${isSpace ? 'bg-white/[0.04]' : 'bg-slate-50/50'}`}
          >
            <h2
              className={`mb-3 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-widest ${
                isSpace ? 'text-white/60' : 'text-uv-gray'
              }`}
            >
              <FiHash size={16} /> {t('searchPage.tabPosts')}
            </h2>
            {data.top.posts.length === 0 ? (
              <p className="px-1 text-sm text-uv-gray">{t('searchPage.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {data.top.posts.map((p) => {
                  const hi = data.highlights?.posts?.[String(p.post_id)]?.[0];
                  return postCard(p, hi, p.post_id);
                })}
              </ul>
            )}
          </section>
          <section
            className={`rounded-2xl p-1 md:p-2 ${isSpace ? 'bg-white/[0.04]' : 'bg-slate-50/50'}`}
          >
            <h2
              className={`mb-3 flex items-center gap-2 px-1 text-sm font-black uppercase tracking-widest ${
                isSpace ? 'text-white/60' : 'text-uv-gray'
              }`}
            >
              <FiUsers size={16} /> {t('searchPage.tabCommunities')}
            </h2>
            {data.top.communities.length === 0 ? (
              <p className="px-1 text-sm text-uv-gray">{t('searchPage.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {data.top.communities.map((c) => communityCard(c, c.community_id))}
              </ul>
            )}
          </section>
        </div>
      )}

      {!loading && !error && data && 'users' in data && !('top' in data) && (
        <ul className="space-y-2 p-3 md:p-5">
          {data.users.length === 0 ? (
            <p className="text-sm text-uv-gray">{t('searchPage.empty')}</p>
          ) : (
            data.users.map((u) => userCard(u, u.user_id))
          )}
        </ul>
      )}

      {!loading && !error && data && 'posts' in data && !('top' in data) && 'highlights' in data && (
        <ul className="space-y-2 p-3 md:p-5">
          {data.posts.length === 0 ? (
            <p className="text-sm text-uv-gray">{t('searchPage.empty')}</p>
          ) : (
            data.posts.map((p) => {
              const hi = data.highlights?.[String(p.post_id)]?.[0];
              return postCard(p, hi, p.post_id);
            })
          )}
        </ul>
      )}

      {!loading && !error && data && 'communities' in data && !('top' in data) && !('users' in data) && (
        <ul className="space-y-3 p-3 md:p-5">
          {data.communities.length === 0 ? (
            <p className="text-sm text-uv-gray">{t('searchPage.empty')}</p>
          ) : (
            data.communities.map((c) => communityCard(c, c.community_id))
          )}
        </ul>
      )}

      {!loading && !error && !data && !q0.trim() && (
        <p className="p-6 text-sm text-uv-gray">{t('searchPage.placeholder')}</p>
      )}
    </div>
  );
};

export default SearchPage;
