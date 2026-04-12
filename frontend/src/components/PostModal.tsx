import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiImage, FiZap, FiWifi, FiSend } from 'react-icons/fi';
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

      await api.post('/social/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onClose();
      window.location.reload();
    } catch (error) {
      await themedAlert(t('postModal.transmissionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const node = (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-uv-black/60 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        className={`modal-content relative z-[1] flex w-full max-w-xl flex-col overflow-visible rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-xl rounded-bl-xl p-4 shadow-2xl md:p-6 mx-3 md:mx-0 ${
          isSpace ? 'border border-white/10 bg-[#0a0a1a]' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div
            id="post-modal-title"
            className="flex items-center gap-2 rounded-br-2xl border-b border-r border-primary/10 bg-primary/10 px-4 py-2"
          >
            <FiWifi className="shrink-0 text-primary animate-pulse" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {t('postModal.liveConnection')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors md:h-10 md:w-10 ${
              isSpace ? 'text-white/70 hover:bg-white/10' : 'text-uv-gray hover:bg-gray-100'
            }`}
            aria-label={t('common.close')}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex gap-4 md:gap-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-tl-xl rounded-br-xl border border-primary/20 bg-primary/5 text-sm font-black text-primary shadow-inner md:h-14 md:w-14 md:rounded-tl-2xl md:rounded-br-2xl md:text-xl overflow-hidden`}
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
              className={`min-h-[120px] w-full resize-none border-none bg-transparent text-base font-semibold outline-none ring-0 focus:ring-0 md:min-h-[160px] md:text-2xl md:font-black ${
                isSpace
                  ? 'text-white placeholder:text-white/35'
                  : 'text-uv-black placeholder:text-primary/30'
              }`}
              placeholder={t('postModal.placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {previewUrl && selectedImage && (
              <div className="relative mt-2 mb-6">
                {selectedImage.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                    className="max-h-[300px] w-full rounded-tl-[3rem] rounded-br-[3rem] border-4 border-white object-contain bg-black shadow-2xl"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt=""
                    className="max-h-[300px] w-full rounded-tl-[3rem] rounded-br-[3rem] border-4 border-white object-cover shadow-2xl"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 rounded-xl bg-uv-black/80 p-2 text-white hover:bg-uv-black"
                  aria-label={t('common.close')}
                >
                  <FiX size={20} />
                </button>
              </div>
            )}

            <div
              className={`mt-2 flex items-center justify-between border-t pt-3 md:mt-4 md:pt-4 ${
                isSpace ? 'border-white/10' : 'border-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <label
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-all md:h-12 md:w-12 md:rounded-xl ${
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
                  className={`flex h-9 w-9 items-center justify-center rounded-lg md:h-12 md:w-12 md:rounded-xl ${
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
