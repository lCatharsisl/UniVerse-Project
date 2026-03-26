import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { FiHeart, FiMessageCircle, FiRepeat, FiRefreshCcw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

type DiscoverPost = {
  post_id: number;
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  content?: string | null;
  image_url?: string | null;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
};

const DiscoverFeed: React.FC = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const resolveImageUrl = (raw?: string | null) => {
    if (!raw) return '';
    const value = raw.trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    // Normalize possible API-prefixed paths.
    const normalized = value.startsWith('/api/uploads/')
      ? value.replace('/api/uploads/', '/uploads/')
      : value.startsWith('api/uploads/')
      ? value.replace('api/uploads/', '/uploads/')
      : value.startsWith('uploads/')
      ? `/${value}`
      : value;
    const backendOrigin = `${window.location.protocol}//${window.location.hostname}:3000`;
    return `${backendOrigin}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  };

  const fetchDiscover = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await api.get('/social/discover');
      setPosts((res.data?.items || []) as DiscoverPost[]);
    } catch (e: any) {
      setError((e?.response?.data?.error as string) || 'Failed to load discover feed');
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
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-uv-black">{t('discoverPage.title')}</h1>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-uv-gray">{t('discoverPage.subtitle')}</p>
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchDiscover(true);
              setRefreshing(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80"
          >
            <FiRefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} />
            {t('discoverPage.refresh')}
          </button>
        </div>
      </div>
      {posts.length === 0 && (
        <div className="rounded-xl border border-uv-border p-4 text-sm text-uv-gray">
          {t('discoverPage.empty')}
        </div>
      )}
      {posts.map((post) => (
        <article key={post.post_id} className="rounded-2xl border border-uv-border bg-white p-4">
          <div className="mb-2 text-xs text-uv-gray">
            {(post.first_name || post.email || 'User') + (post.last_name ? ` ${post.last_name}` : '')}
          </div>
          {post.content && <p className="text-sm text-uv-black whitespace-pre-wrap">{post.content}</p>}
          {post.image_url && (
            <img
              src={resolveImageUrl(post.image_url)}
              alt="discover"
              className="mt-3 w-full max-h-[420px] object-cover rounded-xl border border-uv-border"
              onError={(e) => {
                // Hide broken image element instead of showing broken icon.
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="mt-3 text-xs text-uv-gray flex items-center gap-4">
            <span className="inline-flex items-center gap-1"><FiHeart size={12} /> {(post.likes_count || 0).toString()} {t('discoverPage.likes')}</span>
            <span className="inline-flex items-center gap-1"><FiMessageCircle size={12} /> {(post.comments_count || 0).toString()} {t('discoverPage.comments')}</span>
            <span className="inline-flex items-center gap-1"><FiRepeat size={12} /> {(post.reposts_count || 0).toString()} {t('discoverPage.reposts')}</span>
          </div>
        </article>
      ))}
    </div>
  );
};

export default DiscoverFeed;
