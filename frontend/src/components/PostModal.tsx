import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiImage, FiZap, FiSend } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { themedAlert } from '../utils/themedDialog';
import { getAuthUserAvatarUrl, getAuthUserInitials } from '../utils/authUserDisplay';

interface PostModalProps {
  onClose: () => void;
}

const PostModal: React.FC<PostModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const modalAvatarUrl = getAuthUserAvatarUrl(user);
  const modalInitials = getAuthUserInitials(user);
  const modalDisplayName = String(
    user?.profile?.student_name ||
    user?.profile?.staff_name ||
    user?.email?.split('@')[0] ||
    t('postModal.liveConnection')
  );
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (selectedImage) {
        formData.append('images', selectedImage);
      }

      await api.post('/social/posts', formData);
      onClose();
      window.location.reload();
    } catch {
      await themedAlert(t('postModal.transmissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const node = (
    <div
      className={`fixed inset-0 z-[500] flex items-center justify-center p-4 backdrop-blur-2xl ${
        isSpace ? 'bg-black/40' : 'bg-black/15'
      }`}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        className={`modal-content relative z-[1] flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border p-4 shadow-2xl backdrop-blur-xl md:p-6 ${
          isSpace
            ? 'border-white/10 bg-[#0d0d1f]/80 text-white'
            : 'border-white/40 bg-white/70 text-uv-black'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border ${
                isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'
              }`}
            >
              {modalAvatarUrl ? (
                <img src={modalAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                modalInitials
              )}
            </div>
            <div className="min-w-0">
              <div id="post-modal-title" className="text-sm font-black uppercase tracking-[0.18em] text-primary">
                {modalDisplayName}
              </div>
              <div className={`text-[11px] font-semibold ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>
                {t('postModal.placeholder')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
              isSpace ? 'border-white/10 text-white/70 hover:bg-white/10' : 'border-uv-border text-uv-gray hover:bg-gray-100'
            }`}
            aria-label={t('common.close')}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex gap-3 md:gap-5">
          <div
            className={`hidden h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 text-sm font-black text-primary shadow-inner md:flex md:h-14 md:w-14 md:text-xl`}
          >
            {modalAvatarUrl ? (
              <img src={modalAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              modalInitials
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              id="post-modal-body"
              name="post-content"
              autoComplete="off"
              autoCorrect="off"
              spellCheck
              rows={5}
              className={`min-h-[150px] w-full resize-none border-none bg-transparent text-lg font-semibold outline-none ring-0 focus:ring-0 md:min-h-[220px] md:text-2xl md:font-black ${
                isSpace
                  ? 'text-white placeholder:text-white/35'
                  : 'text-uv-black placeholder:text-primary/30'
              }`}
              placeholder={t('postModal.placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {previewUrl && selectedImage && (
              <div className="relative mt-3 mb-4">
                {selectedImage.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className={`max-h-[320px] w-full rounded-2xl border object-contain shadow-2xl ${isSpace ? 'border-white/10 bg-black' : 'border-uv-border bg-black'}`}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt=""
                    className={`max-h-[320px] w-full rounded-2xl border object-cover shadow-2xl ${isSpace ? 'border-white/10' : 'border-uv-border'}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-3 right-3 rounded-xl bg-uv-black/80 p-2 text-white hover:bg-uv-black"
                  aria-label={t('common.close')}
                >
                  <FiX size={20} />
                </button>
              </div>
            )}

            <div
              className={`mt-3 flex items-center justify-between border-t pt-3 md:mt-4 md:pt-4 ${
                isSpace ? 'border-white/10' : 'border-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <label
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-all md:h-12 md:w-12 md:rounded-2xl ${
                    isSpace
                      ? 'bg-white/5 text-white/60 hover:bg-primary/15 hover:text-primary'
                      : 'bg-gray-50 text-uv-gray hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/mp4,.mp4"
                    onChange={(e) => e.target.files && setSelectedImage(e.target.files[0])}
                  />
                  <FiImage size={20} />
                </label>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl md:h-12 md:w-12 md:rounded-2xl ${
                    isSpace ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-uv-gray/60'
                  }`}
                  aria-hidden
                >
                  <FiZap size={20} />
                </span>
              </div>

              <button
                type="button"
                disabled={submitting || (!content.trim() && !selectedImage)}
                onClick={handlePost}
                className="uv-button flex items-center gap-2 !py-2 !px-6 text-[10px] md:!gap-3 md:!py-4 md:!px-10 md:text-sm"
              >
                {submitting ? (
                  t('postModal.transmitting')
                ) : (
                  <>
                    <FiSend size={16} /> {t('postModal.broadcast')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default PostModal;
