import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import PostDetailModal from '../components/PostDetailModal';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

function mapPostForModal(raw: Record<string, unknown>) {
  return {
    post_id: Number(raw.post_id),
    user_id: Number(raw.user_id),
    content: String(raw.content ?? ''),
    created_at: String(raw.created_at ?? ''),
    image_url: raw.image_url != null ? String(raw.image_url) : undefined,
    likes_count: Number(raw.likes_count) || 0,
    reposts_count: Number(raw.reposts_count) || 0,
    comments_count: Number(raw.comments_count) || 0,
    has_liked: Boolean(raw.has_liked),
    has_reposted: Boolean(raw.has_reposted),
    first_name: raw.first_name != null ? String(raw.first_name) : undefined,
    last_name: raw.last_name != null ? String(raw.last_name) : undefined,
    email: raw.email != null ? String(raw.email) : undefined,
    avatar_url: raw.avatar_url != null ? String(raw.avatar_url) : undefined,
  };
}

const PostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [post, setPost] = useState<ReturnType<typeof mapPostForModal> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = parseInt(String(postId), 10);
    if (Number.isNaN(id)) {
      setError('invalid');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/social/posts/${id}`);
        if (cancelled) return;
        setPost(mapPostForModal(res.data));
      } catch {
        if (!cancelled) setError('notfound');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const onClose = () => navigate('/feed', { replace: true });

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isSpace ? 'bg-[#050510] text-white' : 'bg-white'}`}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 p-6 ${isSpace ? 'bg-[#050510] text-white' : 'bg-white'}`}>
        <p className="font-black text-sm uppercase tracking-widest text-uv-gray">{t('postPage.notFound')}</p>
        <button type="button" onClick={onClose} className="uv-button text-xs">
          {t('postPage.backToHub')}
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <AnimatePresence>
        <PostDetailModal
          post={post}
          onClose={onClose}
          onUpdate={(updated) => setPost(mapPostForModal(updated as unknown as Record<string, unknown>))}
        />
      </AnimatePresence>
    </div>
  );
};

export default PostPage;
