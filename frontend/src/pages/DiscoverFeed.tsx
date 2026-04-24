import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { FiHeart, FiMessageCircle, FiRepeat, FiRefreshCcw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PostAttachment from '../components/PostAttachment';
import { FeedAvatarImage } from '../components/FeedAvatarImage';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type DiscoverPost = {
  post_id: number;
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  content?: string | null;
  image_url?: string | null;
  created_at: string;
  likes_count?: number | string;
  comments_count?: number | string;
  reposts_count?: number | string;
  reposter_name?: string | null;
  reposter_id?: number | null;
  avatar_url?: string | null;
};

const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
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
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const countOf = (v: number | string | undefined) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  return parseInt(String(v), 10) || 0;
};

const DiscoverFeed: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDiscover = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await api.get('/social/discover');
      setPosts((res.data?.items || []) as DiscoverPost[]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError((err?.response?.data?.error as string) || 'Failed to load discover feed');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      await fetchDiscover();
    };
    run();
    const poll = window.setInterval(() => {
      if (!mounted) return;
      fetchDiscover(true).catch(() => {});
    }, 12000);
    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, []);

  if (loading) return <div className="p-6 text-sm text-uv-gray">{t('discoverPage.loading')}</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;

  return (
    <div className="w-full min-w-0 max-w-full pb-24 md:pb-10">
      <div className="p-3 md:p-5 border-b border-uv-border/60">
        <h1
          className={`text-2xl font-black tracking-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}
        >
          {t('discoverPage.title')}
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className={`text-sm ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
            {t('discoverPage.subtitle')}
          </p>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await fetchDiscover(true);
              setRefreshing(false);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80"
            aria-label={t('discoverPage.refresh')}
          >
            <FiRefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} />
            {t('discoverPage.refresh')}
          </button>
        </div>
      </div>

      {posts.length === 0 && (
        <div
          className={`mx-3 md:mx-5 mt-4 rounded-2xl border p-4 text-sm ${
            isSpace ? 'border-white/10 bg-white/5 text-white/60' : 'border-uv-border bg-gray-50/50 text-uv-gray'
          }`}
        >
          {t('discoverPage.empty')}
        </div>
      )}

      <div className="w-full min-w-0 px-1 pb-4 md:px-0">
        {posts.map((post) => {
          const repKey = post.reposter_id != null ? String(post.reposter_id) : 'orig';
          const rowKey = `${post.post_id}-${repKey}`;
          const displayName =
            [post.first_name, post.last_name].filter(Boolean).join(' ').trim() || post.email || t('messagesPage.user');
          const handle = post.email?.split('@')[0];

          return (
            <article
              key={rowKey}
              className={`p-3 md:p-5 rounded-2xl border transition-all mb-3 last:mb-0 ${
                isSpace
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-50/80 border-uv-border/50 shadow-sm'
              }`}
            >
              {!!post.reposter_id && (
                <div
                  className={`mb-1 flex items-center gap-1.5 pl-1 text-[7px] font-black uppercase tracking-widest md:pl-2 md:text-[10px] ${
                    isSpace ? 'text-emerald-400' : 'text-green-600'
                  }`}
                >
                  <FiRepeat size={9} aria-hidden />
                  <span>
                    {post.reposter_id === user?.userId
                      ? t('socialFeed.you')
                      : post.reposter_name || t('messagesPage.user')}{' '}
                    {t('socialFeed.boosted')}
                  </span>
                </div>
              )}

              <div className="flex gap-2 md:gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                  className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-primary/20 bg-primary/10 font-black text-primary md:h-12 md:w-12 md:text-base"
                  aria-label={displayName}
                >
                  <FeedAvatarImage
                    src={post.avatar_url ? resolveMediaUrl(post.avatar_url) : undefined}
                    initials={getInitials(post.first_name, post.last_name, post.email)}
                    imgClassName="h-full w-full object-cover"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={`mb-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs md:text-sm ${
                      isSpace ? 'text-white' : 'text-uv-black'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${post.user_id}`)}
                      className={`text-left font-black hover:underline ${
                        isSpace ? 'text-white' : 'text-uv-black'
                      }`}
                    >
                      {displayName}
                    </button>
                    {handle && (
                      <span
                        className={`text-[8px] font-bold uppercase tracking-tighter md:text-[10px] ${
                          isSpace ? 'text-white/50' : 'text-uv-gray'
                        }`}
                      >
                        @{handle}
                      </span>
                    )}
                    <span className={isSpace ? 'text-white/30' : 'text-uv-gray'}>·</span>
                    <time
                      dateTime={post.created_at}
                      className={`text-[8px] font-bold uppercase md:text-[10px] ${
                        isSpace ? 'text-white/45' : 'text-uv-gray'
                      }`}
                    >
                      {formatDate(post.created_at)}
                    </time>
                  </div>

                  {!!post.content && (
                    <p
                      className={`mb-2 break-words text-sm font-medium leading-relaxed whitespace-pre-wrap md:text-[15px] ${
                        isSpace ? 'text-white' : 'text-uv-black'
                      }`}
                    >
                      {post.content}
                    </p>
                  )}

                  {post.image_url && (
                    <div className="min-w-0">
                      <PostAttachment
                        path={post.image_url}
                        className="mt-1 overflow-hidden rounded-xl border border-uv-border/50"
                        mediaClassName="max-h-[min(60vh,480px)] w-full object-cover"
                      />
                    </div>
                  )}

                  <div
                    className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs ${
                      isSpace ? 'border-white/10 text-white/60' : 'border-uv-border/60 text-uv-gray'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <FiHeart size={12} aria-hidden />
                      {countOf(post.likes_count)} {t('discoverPage.likes')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FiMessageCircle size={12} aria-hidden />
                      {countOf(post.comments_count)} {t('discoverPage.comments')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FiRepeat size={12} aria-hidden />
                      {countOf(post.reposts_count)} {t('discoverPage.reposts')}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default DiscoverFeed;
